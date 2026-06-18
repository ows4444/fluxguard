import { randomUUID } from 'node:crypto';

import type {
  Clock,
  EventPublisher,
  IBypassTokenVerifier,
  IPolicyResolver,
  IRateLimitStore,
  PeekConsistency,
  RateLimitDecision,
  RateLimiterResetCommand,
  RateLimitEvent,
  RateLimitPolicy,
  RateLimitRequest,
  RateLimitRule,
  RateLimitSnapshot,
  ResetResult,
} from '@fluxguard/contracts';
import type { PeekCommand } from '@fluxguard/contracts';
import {
  InvalidRateLimitRequestError,
  isCalendarMonthWindow,
  isFixedWindow,
  RATE_LIMIT_EVENT_SCHEMA_VERSION,
  StoreFailureError,
  validateRequest,
  windowToMs,
} from '@fluxguard/contracts';

import type { AlgorithmRegistry } from './algorithms/algorithm.registry';
import { BypassChecker } from './bypass/bypass-checker';
import { createEnforcement } from './enforcement/enforcement-factory';
import { createDecisionEvent } from './events/decision-event-factory';
import type { KeyBuilder } from './keys/key-builder';
import type { RuleMatcher } from './policy/rule-matcher';
import { type RuleSelection, RuleSelector } from './policy/rule-selector';
import type { DegradationPolicy } from './runtime/degradation-policy';
import { type ErrorReporter, NoopErrorReporter } from './runtime/error-reporter';
import { createEvaluationSnapshot } from './runtime/evaluation-snapshot';
import type { RequestIdentityProvider } from './runtime/request-identity-provider';
import type { RuleResolutionResult } from './runtime/resolved-rule';
import { AlwaysEvaluateShadowPolicy, type ShadowEvaluationPolicy } from './runtime/shadow-evaluation-policy';
import { ShadowRuleEvaluationError } from './runtime/shadow-rule-error';

const MAX_CONCURRENT_SHADOW_RULES = 10;

export interface EventPublisherConfig {
  readonly environment?: string;
  readonly producer: string;
  readonly producerVersion: string;
  readonly publisher: EventPublisher;
  readonly region?: string;
}

export interface RateLimiterOptions {
  readonly shadowEvaluationPolicy?: ShadowEvaluationPolicy;

  readonly errorReporter?: ErrorReporter;

  readonly algorithmRegistry: AlgorithmRegistry;

  readonly requestIdentityProvider: RequestIdentityProvider;

  readonly keyBuilder: KeyBuilder;

  readonly ruleMatcher: RuleMatcher;

  readonly ruleSelector: Pick<RuleSelector, 'select'>;

  readonly clock: Clock;

  readonly policyResolver: IPolicyResolver;

  readonly store: IRateLimitStore;

  readonly eventPublisher?: EventPublisherConfig;

  readonly bypassTokenVerifier?: IBypassTokenVerifier;

  readonly bypassChecker?: BypassChecker;

  readonly degradationPolicy: DegradationPolicy;
}

export class RateLimiter {
  private readonly bypassChecker: BypassChecker;
  private readonly errorReporter: ErrorReporter;
  private readonly shadowEvaluationPolicy: ShadowEvaluationPolicy;

  constructor(private readonly options: RateLimiterOptions) {
    this.errorReporter = options.errorReporter ?? new NoopErrorReporter();
    this.bypassChecker =
      options.bypassChecker ??
      new BypassChecker({
        onCidrEvaluationError: (cidr, error) =>
          this.errorReporter.report(
            new Error(`Invalid exempt CIDR "${cidr}" encountered at runtime`, { cause: error }),
          ),
      });
    this.shadowEvaluationPolicy = options.shadowEvaluationPolicy ?? new AlwaysEvaluateShadowPolicy();
  }

  private async resolveRule(request: RateLimitRequest): Promise<{
    policy: RateLimitPolicy;
    selection: RuleSelection;
  } | null> {
    const policy = await this.options.policyResolver.resolve(request);

    if (!policy) {
      return null;
    }

    const matchingRules = policy.rules.filter((rule) => this.options.ruleMatcher.matches(rule, request));

    return {
      policy,
      selection: this.options.ruleSelector.select(matchingRules),
    };
  }

  private runDetached(operation: Promise<unknown>): void {
    operation.catch((error) => {
      this.onDetachedFailure(error);
    });
  }

  protected onDetachedFailure(error: unknown): void {
    this.errorReporter.report(error);
  }

  private async evaluateShadowRules(request: RateLimitRequest, shadows: readonly RateLimitRule[]): Promise<void> {
    const budgetedShadows = shadows
      .slice()
      .sort((a, b) => b.execution.priority - a.execution.priority)
      .slice(0, MAX_CONCURRENT_SHADOW_RULES);
    const results = await Promise.allSettled(
      budgetedShadows.map(async (rule) => {
        const algorithm = this.options.algorithmRegistry.get(rule.execution.algorithm);

        const key = this.options.keyBuilder.build(request, rule);

        if (!algorithm.supportsShadowEvaluation) {
          return;
        }

        await algorithm.evaluateShadow({
          key,
          rule,
          request,
          clock: this.options.clock,
          startedAtUs: this.options.clock.monotonicUs(),
        });
      }),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.onDetachedFailure(
          new ShadowRuleEvaluationError(
            budgetedShadows[index]!.id,
            budgetedShadows[index]!.execution.algorithm,
            request.route,
            request.method,
            result.reason,
          ),
        );
      }
    }
  }

  private assertValidRequest(request: RateLimitRequest): void {
    const result = validateRequest(request);
    if (!result.valid) {
      throw new InvalidRateLimitRequestError(request, result.errors);
    }
  }

  private async resolveRuleContext(request: RateLimitRequest): Promise<RuleResolutionResult> {
    const resolved = await this.resolveRule(request);

    if (!resolved) {
      return { type: 'policy_miss' };
    }

    const { policy, selection } = resolved;

    if (selection.type === 'miss') {
      return { type: 'rule_miss' };
    }

    if (selection.type === 'shadow_only') {
      return {
        type: 'shadow_only',
        shadows: selection.shadows,
      };
    }

    const key = this.options.keyBuilder.build(request, selection.winner);

    return {
      type: 'resolved',
      context: {
        policy,
        key,
        request,
        rule: selection.winner,
        shadows: selection.shadows,
      },
    };
  }

  async evaluate(request: RateLimitRequest): Promise<RateLimitDecision> {
    this.assertValidRequest(request);
    const startedAtUs = this.options.clock.monotonicUs();

    const resolved = await this.resolveRuleContext(request);

    switch (resolved.type) {
      case 'policy_miss': {
        const decision: RateLimitDecision = { type: 'policy_miss' };
        this.publishDecision(decision, request);
        return decision;
      }

      case 'rule_miss': {
        const decision: RateLimitDecision = { type: 'rule_miss' };
        this.publishDecision(decision, request);
        return decision;
      }

      case 'shadow_only': {
        if (this.shadowEvaluationPolicy.shouldEvaluate()) {
          this.runDetached(this.evaluateShadowRules(request, resolved.shadows));
        }

        const decision: RateLimitDecision = {
          type: 'shadow_only',
        };

        this.publishDecision(decision, request);

        return decision;
      }

      case 'resolved':
        break;
    }

    const { policy, rule, key, shadows } = resolved.context;

    if (policy.bypass && rule.execution.bypassable) {
      const bypass = await this.bypassChecker.check(
        policy.bypass,
        request,
        this.options.bypassTokenVerifier,
        rule.match.scope,
      );
      if (bypass) {
        const decision: RateLimitDecision = {
          type: 'bypass',
          reason: bypass.reason,
          diagnostics: { totalEvaluationDurationUs: this.options.clock.monotonicUs() - startedAtUs },
        };

        this.publishDecision(decision, request);
        return decision;
      }
    }

    if (this.shadowEvaluationPolicy.shouldEvaluate()) {
      this.runDetached(this.evaluateShadowRules(request, shadows));
    }

    const algorithm = this.options.algorithmRegistry.get(rule.execution.algorithm);

    try {
      const idempotencyKey = this.options.requestIdentityProvider.create(request, key, rule.id);

      const result = await algorithm.evaluate({
        key,
        rule,
        request,
        clock: this.options.clock,
        store: this.options.store,
        startedAtUs,
        ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
      });

      const totalEvaluationDurationUs = this.options.clock.monotonicUs() - startedAtUs;

      const enforcement = createEnforcement(rule, result, this.options.clock.nowMs());

      // success/bypass/shadow event payload once the EventPublisher adapter lands.

      const decision: RateLimitDecision = {
        type: 'success',
        diagnostics: {
          totalEvaluationDurationUs,
        },
        enforcement,
        evaluation: createEvaluationSnapshot(rule.id, rule.quota.limit, result),
      };

      this.publishDecision(decision, request);

      return decision;
    } catch (error) {
      if (error instanceof StoreFailureError) {
        const totalEvaluationDurationUs = this.options.clock.monotonicUs() - startedAtUs;

        const decision: RateLimitDecision = {
          type: 'degraded',
          diagnostics: { totalEvaluationDurationUs, terminalStoreFailureType: error.failure.type },
          failure: error.failure,
          enforcement: this.options.degradationPolicy.createEnforcement(error.failure),
        };

        this.publishDecision(decision, request);

        return decision;
      }

      throw error;
    }
  }

  private getPeekConsistency(): PeekConsistency {
    return this.options.store.capabilities().consistency;
  }

  async peek(request: RateLimitRequest): Promise<RateLimitSnapshot | null> {
    this.assertValidRequest(request);

    const resolved = await this.resolveRuleContext(request);

    if (resolved.type === 'policy_miss' || resolved.type === 'rule_miss' || resolved.type === 'shadow_only') {
      return null;
    }

    const { rule, key } = resolved.context;

    const nowMs = this.options.clock.nowMs();

    const command: PeekCommand = {
      key,
      consistency: this.getPeekConsistency(),
      nowMs,
    };

    const result = await this.options.store.peek(command);

    if (!result.ok) {
      throw new StoreFailureError(result);
    }

    if (!result.exists) {
      let resetAtMs = nowMs;

      if (isFixedWindow(rule.quota.window)) {
        const windowMs = windowToMs(rule.quota.window);
        const windowStartMs = this.options.clock.windowStartMs(windowMs);

        resetAtMs = windowStartMs + windowMs;
      } else if (isCalendarMonthWindow(rule.quota.window)) {
        resetAtMs = this.options.clock.calendarWindowResetAtMs(rule.quota.window.timezone, rule.quota.window.anchorDay);
      }

      return {
        consistency: result.consistency,
        limit: rule.quota.limit,
        remaining: rule.quota.limit,
        ...(resetAtMs !== undefined ? { resetAtMs } : {}),
      };
    }

    return {
      consistency: result.consistency,
      limit: rule.quota.limit,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
    };
  }

  async reset(command: RateLimiterResetCommand): Promise<ResetResult> {
    const result = await this.options.store.reset(command);
    this.publishResetEvent(result);
    return result;
  }

  private publishResetEvent(result: ResetResult): void {
    if (!this.options.eventPublisher) {
      return;
    }

    const cfg = this.options.eventPublisher;
    const event: RateLimitEvent = {
      id: randomUUID(),
      type: 'rate_limit.reset',
      producer: cfg.producer,
      producerVersion: cfg.producerVersion,
      occurredAtMs: this.options.clock.nowMs(),
      schemaVersion: RATE_LIMIT_EVENT_SCHEMA_VERSION['rate_limit.reset'],
      ...(cfg.environment ? { environment: cfg.environment } : {}),
      ...(cfg.region ? { region: cfg.region } : {}),
      payload: { deletedKeys: result.deletedCount },
    };

    this.runDetached(cfg.publisher.publish(event));
  }

  private publishDecision(decision: RateLimitDecision, request: RateLimitRequest): void {
    if (!this.options.eventPublisher) {
      return;
    }

    const event = createDecisionEvent(
      decision,
      request,
      this.options.eventPublisher,
      this.options.clock,
      request.tracing,
      this.options.clock.nowMs(),
    );

    if (event) {
      this.runDetached(this.options.eventPublisher.publisher.publish(event));
    }
  }
}

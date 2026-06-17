import type {
  Clock,
  EventPublisher,
  IBypassTokenVerifier,
  IPolicyResolver,
  IRateLimitStore,
  PeekConsistency,
  RateLimitDecision,
  RateLimiterResetCommand,
  RateLimitPolicy,
  RateLimitRequest,
  RateLimitRule,
  RateLimitSnapshot,
  ResetResult,
} from '@fluxguard/contracts';
import type { PeekCommand } from '@fluxguard/contracts';
import { InvalidRateLimitRequestError, StoreFailureError, validateRequest } from '@fluxguard/contracts';

import type { AlgorithmRegistry } from './algorithms/algorithm.registry';
import { BypassChecker } from './bypass/bypass-checker';
import { createEnforcement } from './enforcement/enforcement-factory';
import { createDecisionEvent } from './events/decision-event-factory';
import type { KeyBuilder } from './keys/key-builder';
import type { RuleMatcher } from './policy/rule-matcher';
import { type RuleSelection, RuleSelector } from './policy/rule-selector';
import type { DegradationPolicy } from './runtime/degradation-policy';
import { createEvaluationSnapshot } from './runtime/evaluation-snapshot';
import type { RequestIdentityProvider } from './runtime/request-identity-provider';
import type { RuleResolutionResult } from './runtime/resolved-rule';

const MAX_CONCURRENT_SHADOW_RULES = 10;

export interface EventPublisherConfig {
  readonly environment?: string;
  readonly producer: string;
  readonly producerVersion: string;
  readonly publisher: EventPublisher;
  readonly region?: string;
}

export interface RateLimiterOptions {
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
  constructor(private readonly options: RateLimiterOptions) {
    this.bypassChecker = options.bypassChecker ?? new BypassChecker();
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

  protected onDetachedFailure(_error: unknown): void {
    // intentionally empty
  }

  private async evaluateShadowRules(request: RateLimitRequest, shadows: readonly RateLimitRule[]): Promise<void> {
    const budgetedShadows = [...shadows]
      .sort((a, b) => b.execution.priority - a.execution.priority)
      .slice(0, MAX_CONCURRENT_SHADOW_RULES);
    const results = await Promise.allSettled(
      budgetedShadows.map(async (rule) => {
        const algorithm = this.options.algorithmRegistry.get(rule.execution.algorithm);

        const key = this.options.keyBuilder.build(request, rule);

        await algorithm.evaluate({
          key,
          rule,
          request,
          clock: this.options.clock,
          store: this.options.store,
          idempotencyKey: this.options.requestIdentityProvider.create(request, key, rule.id),
          startedAtUs: this.options.clock.monotonicUs(),
        });
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.onDetachedFailure(result.reason);
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
      case 'policy_miss':
        return { type: 'policy_miss' };

      case 'rule_miss':
        return { type: 'rule_miss' };

      case 'resolved':
        break;
    }

    const { policy, rule, key, shadows } = resolved.context;

    if (policy.bypass && rule.execution.bypassable) {
      const bypass = await this.bypassChecker.check(
        policy.bypass,
        request,
        this.options.bypassTokenVerifier,
        policy.id,
        policy.version,
        rule.match.scope,
      );
      if (bypass) {
        return {
          type: 'bypass',
          reason: bypass.reason,
          diagnostics: { totalEvaluationDurationUs: this.options.clock.monotonicUs() - startedAtUs },
        };
      }
    }

    this.runDetached(this.evaluateShadowRules(request, shadows));

    const algorithm = this.options.algorithmRegistry.get(rule.execution.algorithm);

    try {
      const result = await algorithm.evaluate({
        key,
        rule,
        request,
        clock: this.options.clock,
        store: this.options.store,
        idempotencyKey: this.options.requestIdentityProvider.create(request, key, rule.id),
        startedAtUs,
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

    if (resolved.type === 'policy_miss' || resolved.type === 'rule_miss') {
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
      return {
        consistency: result.consistency,
        limit: rule.quota.limit,
        remaining: rule.quota.limit,
        resetAtMs: nowMs,
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
    return this.options.store.reset(command);
  }

  private publishDecision(decision: RateLimitDecision, request: RateLimitRequest): void {
    if (!this.options.eventPublisher) {
      return;
    }

    const event = createDecisionEvent(decision, request, this.options.eventPublisher, this.options.clock);

    if (event) {
      this.runDetached(this.options.eventPublisher.publisher.publish(event));
    }
  }
}

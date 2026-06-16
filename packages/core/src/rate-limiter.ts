import type {
  Clock,
  EventPublisher,
  IBypassTokenVerifier,
  IPolicyResolver,
  IRateLimitStore,
  RateLimitDecision,
  RateLimiterResetCommand,
  RateLimitRequest,
  RateLimitSnapshot,
  ResetResult,
} from '@fluxguard/contracts';
import type { PeekCommand } from '@fluxguard/contracts';
import { StoreFailureError, validateRequest } from '@fluxguard/contracts';

import type { AlgorithmRegistry } from './algorithms/algorithm.registry';
import { BypassChecker, checkBypass } from './bypass/bypass-checker';
import { createEnforcement } from './enforcement/enforcement-factory';
import type { KeyBuilder } from './keys/key-builder';
import type { RuleMatcher } from './policy/rule-matcher';
import { RuleSelector } from './policy/rule-selector';
import type { RequestIdentityProvider } from './runtime/request-identity-provider';

export interface RateLimiterOptions {
  readonly algorithmRegistry: AlgorithmRegistry;

  readonly requestIdentityProvider: RequestIdentityProvider;

  readonly keyBuilder: KeyBuilder;

  readonly ruleMatcher: RuleMatcher;

  readonly ruleSelector: RuleSelector;

  readonly clock: Clock;

  readonly policyResolver: IPolicyResolver;

  readonly store: IRateLimitStore;

  readonly eventPublisher?: EventPublisher;

  readonly bypassTokenVerifier?: IBypassTokenVerifier;

  readonly bypassChecker?: BypassChecker;
}

export class RateLimiter {
  private readonly bypassChecker: BypassChecker;
  constructor(private readonly options: RateLimiterOptions) {
    this.bypassChecker = options.bypassChecker ?? new BypassChecker();
  }

  private assertValidRequest(request: RateLimitRequest): void {
    if (!validateRequest(request)) {
      throw new Error('Invalid rate limit request');
    }
  }

  async evaluate(request: RateLimitRequest): Promise<RateLimitDecision> {
    this.assertValidRequest(request);
    const startedAtUs = this.options.clock.monotonicUs();

    const policy = await this.options.policyResolver.resolve(request);

    if (!policy) {
      return { type: 'policy_miss' };
    }

    const matchingRules = policy.rules.filter((rule) => this.options.ruleMatcher.matches(rule, request));

    const selection = this.options.ruleSelector.select(matchingRules);

    const rule = selection.winner;

    if (!rule) {
      return { type: 'rule_miss' };
    }

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

    const algorithm = this.options.algorithmRegistry.get(rule.execution.algorithm);

    const key = this.options.keyBuilder.build(request, rule);

    try {
      const result = await algorithm.evaluate({
        key,
        rule,
        request,
        clock: this.options.clock,
        store: this.options.store,
        idempotencyKey: this.options.requestIdentityProvider.create(request),
        startedAtUs,
      });

      const totalEvaluationDurationUs = this.options.clock.monotonicUs() - startedAtUs;

      const enforcement = createEnforcement(rule, result, this.options.clock.nowMs());

      return {
        type: 'success',
        diagnostics: {
          totalEvaluationDurationUs,
        },
        enforcement,
        evaluation: {
          ruleId: rule.id,
          limit: rule.quota.limit,
          remaining: result.remaining,
          resetAtMs: result.resetAtMs,
          ...(result.nextAllowedAtMs !== undefined
            ? {
                nextAllowedAtMs: result.nextAllowedAtMs,
              }
            : {}),
        },
      };
    } catch (error) {
      if (error instanceof StoreFailureError) {
        const totalEvaluationDurationUs = this.options.clock.monotonicUs() - startedAtUs;

        return {
          type: 'degraded',
          diagnostics: {
            totalEvaluationDurationUs,
            terminalStoreFailureType: error.failure.type,
          },

          failure: error.failure,
          enforcement: {
            type: 'degraded',
            failOpen: true,
            storeFailureType: error.failure.type,
          },
        };
      }

      throw error;
    }
  }

  async peek(request: RateLimitRequest): Promise<RateLimitSnapshot | null> {
    this.assertValidRequest(request);

    const policy = await this.options.policyResolver.resolve(request);

    if (!policy) {
      return null;
    }

    const matchingRules = policy.rules.filter((rule) => this.options.ruleMatcher.matches(rule, request));

    const selection = this.options.ruleSelector.select(matchingRules);

    const rule = selection.winner;

    if (!rule) {
      return null;
    }

    const key = this.options.keyBuilder.build(request, rule);

    const command: PeekCommand = {
      key,
      consistency: 'strong',
      nowMs: this.options.clock.nowMs(),
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
        resetAtMs: 0,
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
}

import type { RateLimitPolicy, RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

export interface ResolvedRuleContext {
  readonly key: string;
  readonly policy: RateLimitPolicy;
  readonly request: RateLimitRequest;
  readonly rule: RateLimitRule;
  readonly shadows: readonly RateLimitRule[];
}

export type RuleResolutionResult =
  | { readonly type: 'policy_miss' }
  | { readonly type: 'rule_miss' }
  | {
      readonly shadows: readonly RateLimitRule[];
      readonly type: 'shadow_only';
    }
  | { readonly context: ResolvedRuleContext; readonly type: 'resolved' };

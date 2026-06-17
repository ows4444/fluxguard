import type { RateLimitRule } from '@fluxguard/contracts';

export type RuleSelection =
  | {
      readonly shadows: readonly RateLimitRule[];
      readonly type: 'miss';
    }
  | {
      readonly shadows: readonly RateLimitRule[];
      readonly type: 'matched';
      readonly winner: RateLimitRule;
    };

export class RuleSelector {
  select(rules: readonly RateLimitRule[]): RuleSelection {
    const shadows = rules.filter((rule) => rule.execution.action === 'shadow');

    if (rules.length === 0) {
      return { type: 'miss', shadows };
    }

    const ordered = [...rules].sort(
      (left, right) => right.execution.priority - left.execution.priority || left.id.localeCompare(right.id),
    );

    const winner = ordered.find((r) => r.execution.action !== 'shadow');

    if (!winner) {
      return { type: 'miss', shadows };
    }

    return {
      type: 'matched',
      winner,
      shadows,
    };
  }
}

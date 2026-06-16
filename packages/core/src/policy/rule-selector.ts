import type { RateLimitRule } from '@fluxguard/contracts';

export interface RuleSelection {
  readonly winner: RateLimitRule | null;

  readonly shadows: readonly RateLimitRule[];
}

export class RuleSelector {
  select(rules: readonly RateLimitRule[]): RuleSelection {
    if (rules.length === 0) {
      return {
        winner: null,
        shadows: [],
      };
    }

    const ordered = [...rules].sort(
      (left, right) => right.execution.priority - left.execution.priority || left.id.localeCompare(right.id),
    );

    return {
      winner: ordered.find((r) => r.execution.action !== 'shadow') ?? null,
      shadows: ordered.filter((rule) => rule.execution.action === 'shadow'),
    };
  }
}

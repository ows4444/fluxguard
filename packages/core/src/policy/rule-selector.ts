import type { RateLimitRule } from '@fluxguard/contracts';

export type RuleSelection =
  | {
      readonly shadows: readonly RateLimitRule[];
      readonly type: 'miss';
    }
  | {
      readonly shadows: readonly RateLimitRule[];
      readonly type: 'shadow_only';
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

    let winner: RateLimitRule | undefined;

    for (const rule of rules) {
      if (rule.execution.action === 'shadow') {
        continue;
      }

      if (!winner) {
        winner = rule;
        continue;
      }

      if (
        rule.execution.priority > winner.execution.priority ||
        (rule.execution.priority === winner.execution.priority && rule.id.localeCompare(winner.id) < 0)
      ) {
        winner = rule;
      }
    }

    if (!winner) {
      return shadows.length > 0 ? { type: 'shadow_only', shadows } : { type: 'miss', shadows };
    }

    return {
      type: 'matched',
      winner,
      shadows,
    };
  }
}

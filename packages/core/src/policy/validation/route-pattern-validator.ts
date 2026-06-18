import type { PolicyValidationError, RateLimitRule } from '@fluxguard/contracts';
import { parseRoutePattern } from '@fluxguard/contracts';

export function validateRoutePatterns(rule: RateLimitRule, errors: PolicyValidationError[]): void {
  const patterns = rule.match.routePatterns ?? [];

  const seen = new Set<string>();

  for (const pattern of patterns) {
    if (seen.has(pattern)) {
      errors.push({
        path: ['rules', rule.id, 'match', 'routePatterns'],
        message: `duplicate route pattern: "${pattern}"`,
      });
    }

    seen.add(pattern);

    const segments = pattern.split('/');
    const wildcardIndex = segments.indexOf('**');

    if (wildcardIndex !== -1 && wildcardIndex !== pattern.split('/').length - 1) {
      errors.push({
        path: ['rules', rule.id, 'match', 'routePatterns'],
        message: '** wildcard must be final segment',
      });
    }

    const result = parseRoutePattern(pattern);

    if (!result.ok) {
      errors.push({
        path: ['rules', rule.id, 'match', 'routePatterns'],
        message: result.error,
      });
    }
  }
}

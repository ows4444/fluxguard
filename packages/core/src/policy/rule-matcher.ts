import type { RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

function matchPattern(pattern: string, route: string): boolean {
  if (pattern === route) return true;

  const patternSegments = pattern.split('/');
  const routeSegments = route.split('/');

  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];

    if (p === undefined) {
      return false;
    }

    if (p === '*') {
      return i === patternSegments.length - 1;
    }

    if (i >= routeSegments.length) return false;

    if (p !== routeSegments[i] && !p.startsWith(':')) {
      return false;
    }
  }

  return patternSegments.length === routeSegments.length;
}

export class RuleMatcher {
  matches(rule: RateLimitRule, request: RateLimitRequest): boolean {
    return this.matchesMethod(rule, request) && this.matchesRoute(rule, request);
  }

  private matchesMethod(rule: RateLimitRule, request: RateLimitRequest): boolean {
    const methods = rule.match.methods;

    if (!methods || methods.length === 0) {
      return true;
    }

    return methods.includes(request.method);
  }

  private matchesRoute(rule: RateLimitRule, request: RateLimitRequest): boolean {
    const patterns = rule.match.routePatterns;

    if (!patterns || patterns.length === 0) {
      return true;
    }

    return patterns.some((pattern) => matchPattern(pattern, request.route));
  }
}

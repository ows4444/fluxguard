import type { RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

function matchPattern(pattern: string, route: string): boolean {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);

    return route === prefix || route.startsWith(`${prefix}/`);
  }

  if (pattern === route) {
    return true;
  }

  const patternSegments = pattern.split('/');
  const routeSegments = route.split('/');

  let i = 0;

  while (i < patternSegments.length) {
    const patternSegment = patternSegments[i];

    if (patternSegment === undefined) {
      return false;
    }

    if (patternSegment === '**') {
      return i === patternSegments.length - 1;
    }

    const routeSegment = routeSegments[i];

    if (routeSegment === undefined) {
      return false;
    }

    if (patternSegment !== routeSegment && !patternSegment.startsWith(':')) {
      return false;
    }

    i++;
  }

  return i === routeSegments.length;
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

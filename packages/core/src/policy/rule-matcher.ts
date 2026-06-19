import type { RateLimitRequest, RateLimitRule } from '@fluxguard/contracts';

import { compileRoutePattern } from './compiled-route-pattern';
import { matchesCompiledPattern } from './route-pattern-matcher';

export class RuleMatcher {
  private readonly compiledPatterns = new Map<string, ReturnType<typeof compileRoutePattern>>();

  private getCompiledPattern(pattern: string) {
    let compiled = this.compiledPatterns.get(pattern);

    if (compiled) {
      this.compiledPatterns.delete(pattern);
      this.compiledPatterns.set(pattern, compiled);
      return compiled;
    }

    const MAX_COMPILED_PATTERNS = 10_000;

    compiled = compileRoutePattern(pattern);

    if (this.compiledPatterns.size >= MAX_COMPILED_PATTERNS) {
      const oldest = this.compiledPatterns.keys().next().value;

      if (oldest) {
        this.compiledPatterns.delete(oldest);
      }
    }

    this.compiledPatterns.set(pattern, compiled);

    return compiled;
  }

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

    return patterns.some((pattern) => matchesCompiledPattern(this.getCompiledPattern(pattern), request.route));
  }
}

import { assertNever, type RateLimitRequest, type RateLimitRule, Scope } from '@fluxguard/contracts';

import type { KeyBuilder } from './key-builder';

export class DefaultKeyBuilder implements KeyBuilder {
  private encode(value: string): string {
    return encodeURIComponent(value);
  }

  build(request: RateLimitRequest, rule: RateLimitRule): string {
    switch (rule.match.scope) {
      case Scope.Global:
        return `rl:${this.encode(rule.id)}:global`;

      case Scope.User:
        return `rl:${this.encode(rule.id)}:user:${this.encode(request.userId ?? 'anonymous')}`;

      case Scope.ApiKey:
        return `rl:${this.encode(rule.id)}:api-key:${this.encode(request.apiKeyId ?? 'unknown')}`;

      case Scope.Ip:
        return `rl:${this.encode(rule.id)}:ip:${this.encode(request.ip)}`;

      case Scope.UserRoute:
        return `rl:${this.encode(rule.id)}:user-route:${this.encode(request.userId ?? 'anonymous')}:${this.encode(request.route)}`;

      default:
        return assertNever(rule.match.scope);
    }
  }
}

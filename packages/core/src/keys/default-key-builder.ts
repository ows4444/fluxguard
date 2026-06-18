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
        return request.userId
          ? `rl:${this.encode(rule.id)}:user:id:${this.encode(request.userId)}`
          : `rl:${this.encode(rule.id)}:user:anon:ip:${this.encode(request.ip)}`;

      case Scope.ApiKey:
        return request.apiKeyId
          ? `rl:${this.encode(rule.id)}:api-key:id:${this.encode(request.apiKeyId)}`
          : `rl:${this.encode(rule.id)}:api-key:anon:ip:${this.encode(request.ip)}`;

      case Scope.Ip:
        return `rl:${this.encode(rule.id)}:ip:${this.encode(request.ip)}`;

      case Scope.UserRoute:
        return request.userId
          ? `rl:${this.encode(rule.id)}:user-route:id:${this.encode(request.userId)}:${this.encode(request.route)}`
          : `rl:${this.encode(rule.id)}:user-route:anon:ip:${this.encode(request.ip)}:${this.encode(request.route)}`;

      default:
        return assertNever(rule.match.scope);
    }
  }
}

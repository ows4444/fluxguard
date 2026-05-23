import type { HttpMethod } from '../runtime/runtime.contract';

export type RateLimitScope = 'global' | 'user' | 'api-key' | 'ip' | 'user:route';

export interface RateLimitMatcher {
  readonly methods?: ReadonlyArray<HttpMethod>;
  readonly routePatterns?: ReadonlyArray<string>;
  readonly scope: RateLimitScope;
}

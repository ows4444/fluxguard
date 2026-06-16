import type { HttpMethod } from '../runtime/runtime.contract';

export const Scope = Object.freeze({
  Global: 'global',
  User: 'user',
  ApiKey: 'api-key',
  Ip: 'ip',
  UserRoute: 'user:route',
} as const);

export type RateLimitScope = (typeof Scope)[keyof typeof Scope];

export interface RateLimitMatcher {
  readonly methods?: ReadonlyArray<HttpMethod>;
  readonly routePatterns?: ReadonlyArray<string>;
  readonly scope: RateLimitScope;
}

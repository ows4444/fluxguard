import type { RateLimitRequest } from '../runtime/runtime.contract';
import type { RateLimitAlgorithmId } from './algorithm';
import type { RateLimitMatcher, RateLimitScope } from './matcher.contract';
import type { RateLimitWindowPolicy } from './window.types';
export { Algorithm, type RateLimitAlgorithmId } from './algorithm';
export { type RateLimitScope, Scope } from './matcher.contract';
export {
  type CalendarMonthWindow,
  type RateLimitWindow,
  type RateLimitWindowPolicy,
  type RateLimitWindowUnit,
} from './window.types';

export interface RateLimitQuotaPolicy {
  readonly burstLimit?: number;
  readonly limit: number;
  readonly refillRatePerSec?: number;
  readonly window: RateLimitWindowPolicy;
}

export type RateLimitAction = 'reject' | 'throttle' | 'shadow';

export const RULE_RESOLUTION = Object.freeze({
  tieBreaker: 'rule-id-ascending',
  winner: 'highest-priority',
  shadowBehavior: 'always-observed-independent-of-priority',
  multiMatch: 'single-winner',
} as const);

export interface RateLimitExecutionPolicy {
  readonly action: RateLimitAction;
  readonly algorithm: RateLimitAlgorithmId;
  readonly bypassable: boolean;
  readonly priority: number;
  readonly shedProbability?: number;
}

export interface RateLimitObservabilityMetadata {
  readonly description?: string;
  readonly name?: string;
  readonly tags?: ReadonlyArray<string>;
}

export interface RateLimitRule {
  readonly id: string;

  readonly version?: number;

  readonly execution: RateLimitExecutionPolicy;
  readonly match: RateLimitMatcher;
  readonly meta?: RateLimitObservabilityMetadata;
  readonly quota: RateLimitQuotaPolicy;
}

export interface RateLimitBypassTokenPayload {
  readonly apiKeyId?: string;

  readonly issuedAtMs: number;

  readonly userId?: string;
  readonly expiresAtMs: number;
  readonly issuedBy: string;
  readonly scopes: ReadonlyArray<RateLimitScope>;
}
export type VerifyBypassTokenResult =
  | {
      readonly ok: true;
      readonly payload: RateLimitBypassTokenPayload;
    }
  | {
      readonly ok: false;
      readonly reason: 'expired' | 'invalid_signature' | 'revoked' | 'malformed';
    };

export interface RateLimitBypassPolicy {
  readonly bypassTokensEnabled?: boolean;
  readonly exemptCidrs?: ReadonlyArray<string>;
  readonly exemptUserIds?: ReadonlyArray<string>;
}

export interface IBypassTokenVerifier {
  verify(token: string): Promise<VerifyBypassTokenResult>;
}

export interface RateLimitPolicy {
  readonly id: string;
  readonly version?: number;

  readonly bypass?: RateLimitBypassPolicy;
  readonly rules: ReadonlyArray<RateLimitRule>;
}

export interface IPolicyResolver {
  resolve(request: RateLimitRequest): Promise<RateLimitPolicy | null>;
}

export interface RuntimeCompatibilityError {
  readonly ruleId?: string;
  readonly message: string;
}

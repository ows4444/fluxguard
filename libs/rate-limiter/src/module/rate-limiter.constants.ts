import { SetMetadata } from '@nestjs/common';

import type { RateLimitMetadata } from '../core/types';
import { RateLimitContext } from './rate-limiter.interfaces';

export const RATE_LIMITER_OPTIONS = Symbol('RATE_LIMITER_OPTIONS');

export const RATE_LIMIT_METADATA = 'rate_limit_metadata';

export const RATE_LIMIT_KEY_OVERRIDE = 'rate_limit_key_override';

export const RATE_LIMIT_CONTEXT_RESOLVER = 'rate_limit_context_resolver';

export const RATE_LIMIT_REWARD_METADATA = 'rate_limit_reward_metadata';

export const RATE_LIMIT_PENALTY_METADATA = 'rate_limit_penalty_metadata';

export const SKIP_GLOBAL_RATE_LIMIT = 'skip_global_rate_limit';

export const RateLimit = (...limiters: RateLimitMetadata<string>[]): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_METADATA, limiters);

export const SkipGlobalRateLimit = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_GLOBAL_RATE_LIMIT, true);

export const RateLimitKeyOverride = (override: string): MethodDecorator =>
  SetMetadata(RATE_LIMIT_KEY_OVERRIDE, override);

export const RateLimitContextResolver = (
  resolver: (req: Request) => Partial<RateLimitContext> | Promise<Partial<RateLimitContext>>,
): MethodDecorator => SetMetadata(RATE_LIMIT_CONTEXT_RESOLVER, resolver);

export interface RateLimitAdjustmentMetadata {
  limiter: string;
  amount?: number;
  reason?: string;
}

export const RateLimitReward = (metadata: RateLimitAdjustmentMetadata): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_REWARD_METADATA, metadata);

export const RateLimitPenalty = (metadata: RateLimitAdjustmentMetadata): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_PENALTY_METADATA, metadata);

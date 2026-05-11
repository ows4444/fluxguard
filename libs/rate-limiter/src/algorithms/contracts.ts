import { AdvisoryPeekResult, ConsistentPeekResult, ConsumeResult } from '../core/contracts/result.types';
import type { RateLimitAdjustmentOptions } from '../module/rate-limiter.interfaces';

export interface LimiterAlgorithm {
  consume(key: string, signal?: AbortSignal): Promise<ConsumeResult>;

  peekAdvisory?(key: string): Promise<AdvisoryPeekResult>;

  peekConsistent?(key: string): Promise<ConsistentPeekResult>;

  reward?(options: RateLimitAdjustmentOptions): Promise<void>;

  penalty?(options: RateLimitAdjustmentOptions): Promise<void>;
}

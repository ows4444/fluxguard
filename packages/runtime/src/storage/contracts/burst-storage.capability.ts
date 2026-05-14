import type { BurstConsumeResult, BurstPeekResult } from './storage-record.types';

export interface BurstStorageCapability {
  consumeBurst(key: string, limit: number, refillRate: number, tokens?: number): Promise<BurstConsumeResult>;

  peekBurst(key: string, limit: number): Promise<BurstPeekResult>;
}

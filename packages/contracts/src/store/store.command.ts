import type { StoreFailure } from './store.failure';

export type PeekConsistency = 'strong' | 'eventual';

export type StoreConsumeMode = 'counter' | 'token-bucket';

export interface ConsumeCommand {
  readonly key: string;
  readonly bucketCapacity?: number;
  readonly cost: number;
  readonly idempotencyKey: string;
  readonly idempotencyTtlMs: number;
  readonly limit: number;
  readonly mode: StoreConsumeMode;
  readonly nowMs: number;
  readonly refillRatePerSec?: number;
  readonly windowMs: number;
}

export interface ConsumeResult {
  readonly ok: true;

  readonly allowed: boolean;
  readonly fromIdempotencyCache: boolean;
  readonly fromReplica: boolean;
  readonly nextAllowedAtMs?: number;
  readonly remaining: number;
  readonly resetAtMs: number;
}

export type ConsumeOutcome = ConsumeResult | StoreFailure;

export interface PeekCommand {
  readonly key: string;
  readonly consistency: PeekConsistency;
  readonly nowMs: number;
}

export interface PeekResult {
  readonly ok: true;

  readonly consistency: PeekConsistency;
  readonly exists: boolean;
  readonly fromReplica: boolean;
  readonly remaining: number;
  readonly resetAtMs: number;
}

export type PeekOutcome = PeekResult | StoreFailure;

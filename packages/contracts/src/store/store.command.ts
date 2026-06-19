import type { AlgorithmState } from '../domain/algorithm-state.contract';
import type { StoreFailure } from './store.failure';

export type PeekConsistency = 'strong' | 'eventual';

export type StoreConsumeMode = 'counter' | 'token-bucket';

export interface ConsumeCommand {
  readonly key: string;
  readonly cost: number;
  readonly limit: number;
  readonly mode: StoreConsumeMode;
  readonly nowMs: number;
  readonly resetAtMs?: number;
  readonly windowMs: number;

  readonly signal?: AbortSignal;

  readonly bucketCapacity?: number;
  readonly idempotencyKey?: string;
  readonly idempotencyTtlMs?: number;
  readonly refillRatePerSec?: number;
}

export interface ConsumeResult {
  readonly ok: true;

  readonly allowed: boolean;
  readonly fromIdempotencyCache: boolean;
  readonly fromReplica: boolean;
  readonly nextAllowedAtMs?: number;
  readonly remaining: number;
  readonly resetAtMs: number;

  readonly algorithmState?: AlgorithmState;
}

export type ConsumeOutcome = ConsumeResult | StoreFailure;

export interface PeekCommand {
  readonly key: string;
  readonly consistency: PeekConsistency;
  readonly nowMs: number;

  readonly signal?: AbortSignal;
}

export type PeekResult =
  | {
      readonly ok: true;

      readonly consistency: PeekConsistency;
      readonly exists: false;
      readonly fromReplica: boolean;

      readonly algorithmState?: AlgorithmState;
      readonly nextAllowedAtMs?: number;
    }
  | {
      readonly ok: true;

      readonly consistency: PeekConsistency;
      readonly exists: true;
      readonly fromReplica: boolean;

      readonly remaining: number;
      readonly resetAtMs: number;

      readonly algorithmState?: AlgorithmState;
      readonly nextAllowedAtMs?: number;
    };

export type PeekOutcome = PeekResult | StoreFailure;

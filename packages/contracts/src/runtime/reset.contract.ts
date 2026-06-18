export interface RateLimiterResetCommand {
  readonly keyPrefix?: string;
}

export interface ResetResult {
  readonly deletedCount: number;
  readonly deletedIdempotencyKeys?: number;
}

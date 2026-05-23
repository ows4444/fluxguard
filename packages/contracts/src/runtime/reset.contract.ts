export interface RateLimiterResetCommand {
  readonly apiKeyId?: string;
  readonly ruleId?: string;
  readonly userId?: string;
  readonly ip?: string;
}

export interface ResetResult {
  readonly deletedCount: number;
}

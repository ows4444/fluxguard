export interface RateLimitContext {
  readonly deviceId?: string;
  readonly userId?: string;
  readonly ip?: string;
  readonly keyOverride?: string;
}

export type RuntimeContextAttributes = Record<string, string | undefined>;

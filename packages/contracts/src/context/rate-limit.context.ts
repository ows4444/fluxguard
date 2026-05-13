export interface RateLimitContext {
  ip?: string;
  userId?: string;
  deviceId?: string;
  keyOverride?: string;
  [extra: string]: string | undefined;
}

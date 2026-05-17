import type { JsonPrimitive, ReadonlyRecord } from '../primitives';

export interface RateLimitContext {
  readonly deviceId?: string;
  readonly userId?: string;
  readonly ip?: string;
  readonly keyOverride?: string;
}

export type RuntimeContextAttributes = ReadonlyRecord<string, JsonPrimitive | undefined>;

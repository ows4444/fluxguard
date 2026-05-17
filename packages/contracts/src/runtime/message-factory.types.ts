import type { DurationMilliseconds } from '../primitives';

export type RetryAfterMessageFactory = (retryAfter: DurationMilliseconds) => string;

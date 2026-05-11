import { RateLimiterConsistencyError } from '../errors/rate-limiter.errors';

function ensureArray(value: unknown, script: string, minimumLength: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new RateLimiterConsistencyError(`Redis script "${script}" returned non-array response`);
  }

  if (value.length < minimumLength) {
    throw new RateLimiterConsistencyError(
      [
        `Redis script "${script}" returned invalid tuple length`,
        `expected>=${minimumLength}`,
        `actual=${value.length}`,
      ].join(' '),
    );
  }

  return value;
}

function toInteger(value: unknown, script: string, field: string): number {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new RateLimiterConsistencyError(
      [`Redis script "${script}" returned invalid numeric field`, `field=${field}`].join(' '),
    );
  }

  return Math.max(0, Math.floor(normalized));
}

function toBoolean(value: unknown, script: string, field: string): boolean {
  if (value !== 0 && value !== 1 && value !== true && value !== false) {
    throw new RateLimiterConsistencyError(
      [`Redis script "${script}" returned invalid boolean field`, `field=${field}`].join(' '),
    );
  }

  return value === 1 || value === true;
}

export interface GcraConsumeResponse {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
  readonly remaining: number;
}

export function decodeGcraConsumeResponse(value: unknown): GcraConsumeResponse {
  const tuple = ensureArray(value, 'gcra-consume', 3);

  return {
    allowed: toBoolean(tuple[0], 'gcra-consume', 'allowed'),
    retryAfterMs: toInteger(tuple[1], 'gcra-consume', 'retryAfterMs'),
    remaining: toInteger(tuple[2], 'gcra-consume', 'remaining'),
  };
}

export interface GcraPeekResponse {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
  readonly remaining: number;
}

export function decodeGcraPeekResponse(value: unknown): GcraPeekResponse {
  const tuple = ensureArray(value, 'gcra-peek', 3);

  return {
    allowed: toBoolean(tuple[0], 'gcra-peek', 'allowed'),
    retryAfterMs: toInteger(tuple[1], 'gcra-peek', 'retryAfterMs'),
    remaining: toInteger(tuple[2], 'gcra-peek', 'remaining'),
  };
}

export interface FixedWindowConsumeResponse {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
  readonly blocked: boolean;
}

export function decodeFixedWindowConsumeResponse(value: unknown): FixedWindowConsumeResponse {
  const tuple = ensureArray(value, 'fixed-window-consume', 4);

  return {
    allowed: toBoolean(tuple[0], 'fixed-window-consume', 'allowed'),
    remaining: toInteger(tuple[1], 'fixed-window-consume', 'remaining'),
    retryAfterMs: toInteger(tuple[2], 'fixed-window-consume', 'retryAfterMs'),
    blocked: toBoolean(tuple[3], 'fixed-window-consume', 'blocked'),
  };
}

export interface FixedWindowGetResponse {
  readonly remaining: number;
  readonly retryAfterMs: number;
  readonly current: number;
}

export function decodeFixedWindowGetResponse(value: unknown): FixedWindowGetResponse {
  const tuple = ensureArray(value, 'fixed-window-get', 3);

  return {
    remaining: toInteger(tuple[0], 'fixed-window-get', 'remaining'),
    retryAfterMs: toInteger(tuple[1], 'fixed-window-get', 'retryAfterMs'),
    current: toInteger(tuple[2], 'fixed-window-get', 'current'),
  };
}

export interface BurstConsumeResponse {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
}

export function decodeBurstConsumeResponse(value: unknown): BurstConsumeResponse {
  const tuple = ensureArray(value, 'burst-consume', 3);

  return {
    allowed: toBoolean(tuple[0], 'burst-consume', 'allowed'),
    remaining: toInteger(tuple[1], 'burst-consume', 'remaining'),
    retryAfterMs: toInteger(tuple[2], 'burst-consume', 'retryAfterMs'),
  };
}

export interface BurstGetResponse {
  readonly remaining: number;
  readonly retryAfterMs: number;
}

export function decodeBurstGetResponse(value: unknown): BurstGetResponse {
  const tuple = ensureArray(value, 'burst-get', 2);

  return {
    remaining: toInteger(tuple[0], 'burst-get', 'remaining'),
    retryAfterMs: toInteger(tuple[1], 'burst-get', 'retryAfterMs'),
  };
}

export interface CooldownConsumeResponse {
  readonly retryAfterMs: number;
}

export function decodeCooldownConsumeResponse(value: unknown): CooldownConsumeResponse {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new RateLimiterConsistencyError('Redis script "cooldown" returned invalid numeric response');
  }

  return {
    retryAfterMs: Math.max(0, Math.floor(normalized)),
  };
}

export interface CooldownGetResponse {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
}

export function decodeCooldownGetResponse(value: unknown): CooldownGetResponse {
  const tuple = ensureArray(value, 'cooldown-get', 2);

  return {
    allowed: toBoolean(tuple[0], 'cooldown-get', 'allowed'),
    retryAfterMs: toInteger(tuple[1], 'cooldown-get', 'retryAfterMs'),
  };
}

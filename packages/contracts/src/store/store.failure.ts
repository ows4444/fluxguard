export const StoreFailureType = Object.freeze({
  Timeout: 'store.timeout',
  ConnectionLost: 'store.connection_lost',
  CircuitOpen: 'store.circuit_open',
  InvalidResponse: 'store.invalid_response',
  Unknown: 'store.unknown',
} as const);

export type StoreFailureType = (typeof StoreFailureType)[keyof typeof StoreFailureType];

export interface BaseStoreFailure {
  readonly ok: false;

  readonly occurredAtMs: number;

  readonly operation?: 'consume' | 'peek';

  readonly storeNode?: string;

  readonly retryable: boolean;
  readonly transient: boolean;
}
export interface TimeoutStoreFailure extends BaseStoreFailure {
  readonly suggestedRetryDelayMs?: number;
  readonly timeoutMs: number;
  readonly type: typeof StoreFailureType.Timeout;
}

export interface ConnectionLostStoreFailure extends BaseStoreFailure {
  readonly suggestedRetryDelayMs?: number;

  readonly type: typeof StoreFailureType.ConnectionLost;
}

export interface CircuitOpenStoreFailure extends BaseStoreFailure {
  readonly retryAtMs: number;
  readonly suggestedRetryDelayMs?: number;

  readonly type: typeof StoreFailureType.CircuitOpen;
}

export interface InvalidResponseStoreFailure extends BaseStoreFailure {
  readonly type: typeof StoreFailureType.InvalidResponse;
}

export interface UnknownStoreFailure extends BaseStoreFailure {
  readonly type: typeof StoreFailureType.Unknown;
}

export type StoreFailure =
  | TimeoutStoreFailure
  | ConnectionLostStoreFailure
  | CircuitOpenStoreFailure
  | InvalidResponseStoreFailure
  | UnknownStoreFailure;

const KNOWN_STORE_FAILURE_TYPES = new Set<string>(Object.values(StoreFailureType));

export function isStoreFailure(value: unknown): value is StoreFailure {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StoreFailure>;

  const baseValid =
    candidate.ok === false &&
    typeof candidate.type === 'string' &&
    KNOWN_STORE_FAILURE_TYPES.has(candidate.type) &&
    Number.isFinite(candidate.occurredAtMs) &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.transient === 'boolean' &&
    (candidate.operation === undefined || candidate.operation === 'consume' || candidate.operation === 'peek') &&
    (candidate.storeNode === undefined || typeof candidate.storeNode === 'string');

  if (!baseValid) {
    return false;
  }

  switch (candidate.type) {
    case StoreFailureType.Timeout:
      return Number.isFinite(candidate.timeoutMs);

    case StoreFailureType.ConnectionLost:
      return true;

    case StoreFailureType.CircuitOpen:
      return Number.isFinite(candidate.retryAtMs);

    case StoreFailureType.InvalidResponse:
      return true;

    case StoreFailureType.Unknown:
      return true;

    default:
      return false;
  }
}

export function isStoreSuccess<T extends { readonly ok: true } | { readonly ok: false }>(
  value: T,
): value is Extract<T, { readonly ok: true }> {
  return value.ok === true;
}

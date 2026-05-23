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

export function isStoreFailure(value: unknown): value is StoreFailure {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StoreFailure>;

  return (
    candidate.ok === false &&
    typeof candidate.type === 'string' &&
    typeof candidate.occurredAtMs === 'number' &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.transient === 'boolean'
  );
}

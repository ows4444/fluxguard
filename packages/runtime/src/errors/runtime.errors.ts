export class UnknownLimiterError extends Error {
  override readonly name = 'UnknownLimiterError';

  constructor(limiter: string) {
    super(`Unknown limiter: ${limiter}`);
  }
}

export class RuntimeStorageError extends Error {
  override readonly name = 'RuntimeStorageError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RuntimeExecutionError extends Error {
  override readonly name = 'RuntimeExecutionError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class RuntimeConfigurationError extends Error {
  override readonly name = 'RuntimeConfigurationError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

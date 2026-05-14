export class RuntimeConcurrencyQueueFullError extends Error {
  override readonly name = 'RuntimeConcurrencyQueueFullError';

  constructor(group: string, limit: number) {
    super(`Concurrency queue full for group "${group}" (limit: ${limit})`);
  }
}

export class RuntimeConcurrencyTimeoutError extends Error {
  override readonly name = 'RuntimeConcurrencyTimeoutError';

  constructor(group: string, timeoutMs: number) {
    super(`Concurrency wait timeout for group "${group}" after ${timeoutMs}ms`);
  }
}

export class RuntimeConcurrencyManagerDestroyedError extends Error {
  constructor() {
    super('Runtime concurrency manager has been destroyed');

    this.name = 'RuntimeConcurrencyManagerDestroyedError';
  }
}

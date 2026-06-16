import type { StoreFailure } from './store.failure';

export class StoreFailureError extends Error {
  constructor(public readonly failure: StoreFailure) {
    super(failure.type, { cause: failure });
    this.name = 'StoreFailureError';
  }
}

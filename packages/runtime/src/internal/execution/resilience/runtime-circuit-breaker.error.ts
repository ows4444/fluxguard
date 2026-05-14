export class RuntimeCircuitBreakerOpenError extends Error {
  override readonly name = 'RuntimeCircuitBreakerOpenError';

  constructor() {
    super('Runtime circuit breaker is open');
  }
}

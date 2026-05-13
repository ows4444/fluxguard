export interface RuntimeCircuitBreakerOptions {
  readonly failureThreshold: number;

  readonly recoveryTimeMs: number;
}

export class RuntimeCircuitBreakerService {
  readonly #failureThreshold: number;

  readonly #recoveryTimeMs: number;

  #failures = 0;

  #openedAt: number | null = null;

  constructor(options: RuntimeCircuitBreakerOptions) {
    this.#failureThreshold = options.failureThreshold;
    this.#recoveryTimeMs = options.recoveryTimeMs;
  }

  canExecute(): boolean {
    if (this.#openedAt === null) {
      return true;
    }

    const elapsed = Date.now() - this.#openedAt;

    if (elapsed >= this.#recoveryTimeMs) {
      this.#openedAt = null;
      this.#failures = 0;

      return true;
    }

    return false;
  }

  success(): void {
    this.#failures = 0;
    this.#openedAt = null;
  }

  failure(): void {
    this.#failures += 1;

    if (this.#failures >= this.#failureThreshold) {
      this.#openedAt = Date.now();
    }
  }

  isOpen(): boolean {
    return this.#openedAt !== null;
  }
}

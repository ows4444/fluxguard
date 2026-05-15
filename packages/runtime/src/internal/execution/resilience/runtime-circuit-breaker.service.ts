export interface RuntimeCircuitBreakerOptions {
  readonly failureThreshold: number;

  readonly recoveryTimeMs: number;

  readonly now: () => number;
}

export class RuntimeCircuitBreakerService {
  readonly #failureThreshold: number;

  readonly #recoveryTimeMs: number;

  readonly #now: () => number;

  #failures = 0;

  #openedAt: number | null = null;

  constructor(options: RuntimeCircuitBreakerOptions) {
    this.#failureThreshold = options.failureThreshold;
    this.#recoveryTimeMs = options.recoveryTimeMs;

    this.#now = options.now;
  }

  canExecute(): boolean {
    if (this.#openedAt === null) {
      return true;
    }

    const elapsed = this.#now() - this.#openedAt;

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
      this.#openedAt = this.#now();
    }
  }

  isOpen(): boolean {
    return this.#openedAt !== null;
  }
}

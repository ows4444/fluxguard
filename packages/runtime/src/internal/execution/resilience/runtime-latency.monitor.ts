export interface RuntimeLatencyMonitorOptions {
  readonly sampleSize: number;

  readonly degradedThresholdMs: number;

  readonly openThresholdMs: number;
}

export class RuntimeLatencyMonitor {
  readonly #sampleSize: number;

  readonly #degradedThresholdMs: number;

  readonly #openThresholdMs: number;

  readonly #samples: number[] = [];

  #sum = 0;

  constructor(options: RuntimeLatencyMonitorOptions) {
    this.#sampleSize = options.sampleSize;

    this.#degradedThresholdMs = options.degradedThresholdMs;

    this.#openThresholdMs = options.openThresholdMs;
  }

  record(durationMs: number): void {
    this.#samples.push(durationMs);

    this.#sum += durationMs;

    if (this.#samples.length > this.#sampleSize) {
      const removed = this.#samples.shift();

      if (removed !== undefined) {
        this.#sum -= removed;
      }
    }
  }

  average(): number {
    if (this.#samples.length === 0) {
      return 0;
    }

    return this.#sum / this.#samples.length;
  }

  isDegraded(): boolean {
    return this.average() >= this.#degradedThresholdMs;
  }

  shouldOpen(): boolean {
    return this.average() >= this.#openThresholdMs;
  }
}

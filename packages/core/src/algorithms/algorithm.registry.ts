import type { RateLimitAlgorithmId } from '@fluxguard/contracts';

import type { RateLimitAlgorithm } from './algorithm.contract';

export class AlgorithmRegistry {
  private readonly algorithms = new Map<RateLimitAlgorithmId, RateLimitAlgorithm>();
  private frozen = false;

  static create(registrations: ReadonlyArray<readonly [RateLimitAlgorithmId, RateLimitAlgorithm]>): AlgorithmRegistry {
    const registry = new AlgorithmRegistry();

    for (const [id, algorithm] of registrations) {
      registry.register(id, algorithm);
    }

    registry.freeze();

    return registry;
  }

  register(id: RateLimitAlgorithmId, algorithm: RateLimitAlgorithm): void {
    if (this.frozen) {
      throw new Error('Algorithm registry frozen');
    }

    if (this.algorithms.has(id)) {
      throw new Error(`Algorithm already registered: ${id}`);
    }

    this.algorithms.set(id, algorithm);
  }

  freeze(): void {
    this.frozen = true;
  }

  has(id: RateLimitAlgorithmId): boolean {
    return this.algorithms.has(id);
  }

  get(id: RateLimitAlgorithmId): RateLimitAlgorithm {
    if (!this.frozen) {
      throw new Error(
        `AlgorithmRegistry.get() called before freeze(). ` +
          `Call registry.freeze() after registering all algorithms during bootstrap.`,
      );
    }

    const algorithm = this.algorithms.get(id);

    if (!algorithm) {
      throw new Error(`Algorithm not registered: ${id}`);
    }

    return algorithm;
  }
}

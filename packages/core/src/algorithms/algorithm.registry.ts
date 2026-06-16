import type { RateLimitAlgorithmId } from '@fluxguard/contracts';

import type { RateLimitAlgorithm } from './algorithm.contract';

export class AlgorithmRegistry {
  private readonly algorithms = new Map<RateLimitAlgorithmId, RateLimitAlgorithm>();
  private frozen = false;

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

  get(id: RateLimitAlgorithmId): RateLimitAlgorithm {
    const algorithm = this.algorithms.get(id);

    if (!algorithm) {
      throw new Error(`Algorithm not registered: ${id}`);
    }

    return algorithm;
  }
}

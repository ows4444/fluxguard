import type { RateLimitAlgorithmId } from '@fluxguard/contracts';

import type { RateLimitAlgorithm, RegisteredAlgorithm } from './algorithm.contract';
import {
  AlgorithmAlreadyRegisteredError,
  AlgorithmNotRegisteredError,
  AlgorithmRegistryFrozenError,
  AlgorithmRegistryNotFrozenError,
} from './algorithm-registry.errors';

export class AlgorithmRegistry {
  private readonly algorithms = new Map<RateLimitAlgorithmId, RegisteredAlgorithm>();
  private frozen = false;

  static create(registrations: ReadonlyArray<readonly [RateLimitAlgorithmId, RegisteredAlgorithm]>): AlgorithmRegistry {
    const registry = new AlgorithmRegistry();

    for (const [id, registration] of registrations) {
      registry.register(id, registration);
    }

    registry.freeze();

    return registry;
  }

  register(id: RateLimitAlgorithmId, registration: RegisteredAlgorithm): void {
    if (this.frozen) {
      throw new AlgorithmRegistryFrozenError();
    }

    if (this.algorithms.has(id)) {
      throw new AlgorithmAlreadyRegisteredError(id);
    }

    this.algorithms.set(id, registration);
  }

  freeze(): void {
    this.frozen = true;
  }

  has(id: RateLimitAlgorithmId): boolean {
    if (!this.frozen) {
      throw new AlgorithmRegistryNotFrozenError();
    }

    return this.algorithms.has(id);
  }

  get(id: RateLimitAlgorithmId): RateLimitAlgorithm {
    return this.getRegistration(id).implementation;
  }

  getRegistration(id: RateLimitAlgorithmId): RegisteredAlgorithm {
    if (!this.frozen) {
      throw new AlgorithmRegistryNotFrozenError();
    }

    const registration = this.algorithms.get(id);

    if (!registration) {
      throw new AlgorithmNotRegisteredError(id);
    }

    return registration;
  }
}

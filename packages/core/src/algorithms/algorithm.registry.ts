import { AlgorithmCapabilitiesRegistry, type RateLimitAlgorithmId } from '@fluxguard/contracts';

import type { RateLimitAlgorithm, RegisteredAlgorithm } from './algorithm.contract';
import { AlgorithmAlreadyRegisteredError, AlgorithmNotRegisteredError } from './algorithm-registry.errors';

export class AlgorithmRegistry {
  private constructor(private readonly algorithms: ReadonlyMap<RateLimitAlgorithmId, RegisteredAlgorithm>) {}

  static create(registrations: ReadonlyArray<readonly [RateLimitAlgorithmId, RegisteredAlgorithm]>): AlgorithmRegistry {
    const algorithms = new Map<RateLimitAlgorithmId, RegisteredAlgorithm>();

    for (const [id, registration] of registrations) {
      const expected = AlgorithmCapabilitiesRegistry[id];

      if (!expected) {
        throw new AlgorithmNotRegisteredError(id);
      }

      if (
        registration.capabilities.storeMode !== expected.storeMode ||
        registration.capabilities.supportsBurstLimit !== expected.supportsBurstLimit ||
        registration.capabilities.supportsRefillRate !== expected.supportsRefillRate
      ) {
        throw new Error(`Algorithm capability mismatch for ${id}`);
      }

      if (algorithms.has(id)) {
        throw new AlgorithmAlreadyRegisteredError(id);
      }

      algorithms.set(id, registration);
    }

    return new AlgorithmRegistry(algorithms);
  }

  has(id: RateLimitAlgorithmId): boolean {
    return this.algorithms.has(id);
  }

  get(id: RateLimitAlgorithmId): RateLimitAlgorithm {
    return this.getRegistration(id).implementation;
  }

  getRegistration(id: RateLimitAlgorithmId): RegisteredAlgorithm {
    const registration = this.algorithms.get(id);

    if (!registration) {
      throw new AlgorithmNotRegisteredError(id);
    }

    return registration;
  }
}

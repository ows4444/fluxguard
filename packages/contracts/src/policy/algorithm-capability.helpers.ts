import type { RateLimitAlgorithmId } from './algorithm';
import { AlgorithmCapabilitiesRegistry } from './algorithm-capabilities';
import type { RateLimitWindowPolicy } from './window.types';

export function getAlgorithmCapabilities(algorithm: RateLimitAlgorithmId) {
  return AlgorithmCapabilitiesRegistry[algorithm];
}

export function supportsWindowType(algorithm: RateLimitAlgorithmId, window: RateLimitWindowPolicy['type']): boolean {
  return getAlgorithmCapabilities(algorithm).supportedWindows.includes(window);
}

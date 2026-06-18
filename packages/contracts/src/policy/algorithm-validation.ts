import { AlgorithmCapabilitiesRegistry } from './algorithm-capabilities';
import type { RateLimitAlgorithmId, RateLimitWindowPolicy } from './policy.contract';

export function supportsWindowType(algorithm: RateLimitAlgorithmId, window: RateLimitWindowPolicy['type']): boolean {
  return AlgorithmCapabilitiesRegistry[algorithm].supportedWindows.includes(window);
}

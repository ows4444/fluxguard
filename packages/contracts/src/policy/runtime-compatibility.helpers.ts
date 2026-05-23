import type { RateLimitAlgorithmId, RateLimitWindowPolicy } from './policy.contract';
import { SupportedWindowPolicies } from './runtime-compatibility.constants';

export function supportsWindowPolicy(algorithm: RateLimitAlgorithmId, window: RateLimitWindowPolicy): boolean {
  return SupportedWindowPolicies[algorithm].includes(window.type);
}

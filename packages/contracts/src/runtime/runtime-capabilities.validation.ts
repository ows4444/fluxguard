import { RateLimiterConfigurationError } from '../errors';
import type { RuntimeCapabilities } from './runtime-capabilities.types';

export function validateRuntimeCapabilities(capabilities: RuntimeCapabilities): void {
  // Consistency invariants
  if (capabilities.strongConsistency && !capabilities.singleProcessSerializedConsumption) {
    throw new RateLimiterConfigurationError('strongConsistency requires singleProcessSerializedConsumption');
  }

  if (capabilities.consistentPeek && !capabilities.singleProcessSerializedConsumption) {
    throw new RateLimiterConfigurationError('consistentPeek requires singleProcessSerializedConsumption');
  }

  if (capabilities.strongConsistency && !capabilities.distributed) {
    throw new RateLimiterConfigurationError('strongConsistency requires distributed runtime coordination');
  }
}

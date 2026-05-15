import type { RateLimitContext } from '@fluxguard/contracts';

import type { RuntimeIdentityPolicy } from '../../config/index';
import { RuntimeExecutionError } from '../../errors';
import { RuntimeKeyNormalizer } from './runtime-key.normalizer';

const normalizer = new RuntimeKeyNormalizer();

export function buildRuntimeKey(limiterName: string, context: RateLimitContext, policy: RuntimeIdentityPolicy): string {
  if (policy.allowKeyOverride && !policy.ignoreKeyOverride && context.keyOverride) {
    return `${normalizer.normalize(limiterName)}:${normalizer.normalize(context.keyOverride)}`;
  }

  const segments: string[] = [normalizer.normalize(limiterName)];

  for (const segment of policy.keySegments) {
    const value = context[segment];

    if (!value) {
      continue;
    }

    segments.push(`${segment}:${normalizer.normalize(value)}`);
  }

  if (segments.length === 1) {
    throw new RuntimeExecutionError(
      `Unable to build runtime key for limiter "${limiterName}": no identity segments resolved`,
    );
  }

  return segments.join(':');
}

import {
  assertNever,
  type ConsumeCommand,
  QUOTA_ALGORITHM,
  RATE_LIMIT_KIND,
  type RateLimitDecision,
} from '@fluxguard/contracts';

import { consumeCooldown } from '../cooldown';
import { consumeFixedWindow, consumeGcra } from '../quota';
import type { MemoryRuntimeStoreDependencies } from './memory-runtime-store';

const quotaConsumers = {
  [QUOTA_ALGORITHM.FIXED]: consumeFixedWindow,
  [QUOTA_ALGORITHM.GCRA]: consumeGcra,
} as const;

export function dispatchConsume(
  command: ConsumeCommand,
  dependencies: MemoryRuntimeStoreDependencies,
): RateLimitDecision {
  switch (command.config.kind) {
    case RATE_LIMIT_KIND.COOLDOWN:
      return consumeCooldown(command.key, command.config, dependencies);

    case RATE_LIMIT_KIND.QUOTA:
      return quotaConsumers[command.config.algorithm](command.key, command.config, dependencies);

    default:
      return assertNever(command.config);
  }
}

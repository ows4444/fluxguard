import {
  assertValidRateLimitConfig,
  compileRateLimitConfig,
  QUOTA_ALGORITHM,
  RATE_LIMIT_KIND,
  rateLimitPoints,
  seconds,
} from '@fluxguard/contracts';

import { FakeMonotonicClock } from '../src/clock';
import { MemoryRuntimeStore } from '../src/runtime';
import { InMemoryStorage } from '../src/storage';

async function main(): Promise<void> {
  const clock = new FakeMonotonicClock();

  const runtime = new MemoryRuntimeStore({
    clock,
    cooldownStorage: new InMemoryStorage(clock),
    quotaStorage: new InMemoryStorage(clock),
    gcraStorage: new InMemoryStorage(clock),
  });

  const config = compileRateLimitConfig(
    assertValidRateLimitConfig({
      kind: RATE_LIMIT_KIND.QUOTA,
      algorithm: QUOTA_ALGORITHM.GCRA,
      duration: seconds(60),
      points: rateLimitPoints(100),
    }),
  );

  const iterations = 100_000;

  const startedAt = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    await runtime.consume({
      key: `bench:${i % 1000}`,
      config,
    });
  }

  const durationMs = performance.now() - startedAt;

  console.log({
    iterations,
    durationMs,
    opsPerSecond: Math.floor((iterations / durationMs) * 1000),
  });
}

void main();

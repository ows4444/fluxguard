import type { RuntimeMonotonicClock } from './runtime-monotonic-clock.interface';

export class SystemMonotonicClock implements RuntimeMonotonicClock {
  now(): number {
    return performance.now();
  }
}

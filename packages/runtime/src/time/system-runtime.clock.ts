import type { RuntimeClock } from './runtime-clock.interface';

export class SystemRuntimeClock implements RuntimeClock {
  async now(): Promise<number> {
    return Date.now();
  }
}

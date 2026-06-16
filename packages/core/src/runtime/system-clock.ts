import type { Clock } from '@fluxguard/contracts';

export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }

  monotonicUs(): number {
    return Number(process.hrtime.bigint() / 1000n);
  }

  windowStartMs(windowMs: number): number {
    const now = this.nowMs();

    return Math.floor(now / windowMs) * windowMs;
  }

  calendarWindowStartMs(_timezone: string, _anchorDay?: number): number {
    throw new Error('calendar-month-window not implemented');
  }
}

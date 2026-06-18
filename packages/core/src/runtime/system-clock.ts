import type { Clock } from '@fluxguard/contracts';

export class SystemClock implements Clock {
  capabilities() {
    return {
      supportsCalendarMonthWindow: false,
    } as const;
  }

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
    throw new Error('calendar-month-window is not supported by the current runtime');
  }

  calendarWindowResetAtMs(_timezone: string, _anchorDay?: number): number {
    throw new Error('calendar-month-window is not supported by the current runtime');
  }
}

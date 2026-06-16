export type RateLimitWindowUnit = 'second' | 'minute' | 'hour' | 'day';

export interface CalendarMonthWindow {
  readonly anchorDay?: number;
  readonly timezone: string;
  readonly type: 'calendar-month-window';
}

export interface RateLimitWindow {
  readonly size: number;
  readonly type: 'fixed-window';
  readonly unit: RateLimitWindowUnit;
}

export type RateLimitWindowPolicy = RateLimitWindow | CalendarMonthWindow;

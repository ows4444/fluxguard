import type { CalendarMonthWindow, RateLimitWindow, RateLimitWindowPolicy } from './policy.contract';

export function isFixedWindow(window: RateLimitWindowPolicy): window is RateLimitWindow {
  return window.type === 'fixed-window';
}

export function isCalendarMonthWindow(window: RateLimitWindowPolicy): window is CalendarMonthWindow {
  return window.type === 'calendar-month-window';
}

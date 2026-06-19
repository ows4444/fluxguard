import {
  type AlgorithmCapabilities,
  isCalendarMonthWindow,
  isFixedWindow,
  parseAnchorDay,
  parseIanaTimezone,
  type PolicyValidationError,
  type RateLimitRule,
} from '@fluxguard/contracts';

export function validateWindow(
  rule: RateLimitRule,
  errors: PolicyValidationError[],
  capabilities: AlgorithmCapabilities | undefined,
): void {
  const window = rule.quota.window;

  if (isFixedWindow(window)) {
    if (window.size <= 0) {
      errors.push({
        path: ['rules', rule.id, 'quota', 'window', 'size'],
        message: 'window size must be > 0',
      });
    }

    return;
  }

  if (!isCalendarMonthWindow(window)) {
    return;
  }

  const timezoneResult = parseIanaTimezone(window.timezone);

  if (!timezoneResult.ok) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'window', 'timezone'],
      message: timezoneResult.error,
    });
  }

  if (!capabilities) {
    return;
  }

  if (window.anchorDay !== undefined) {
    const anchorDayResult = parseAnchorDay(window.anchorDay);

    if (!anchorDayResult.ok) {
      errors.push({
        path: ['rules', rule.id, 'quota', 'window', 'anchorDay'],
        message: anchorDayResult.error,
      });
    }
  }
}

import {
  isCalendarMonthWindow,
  isFixedWindow,
  parseAnchorDay,
  parseIanaTimezone,
  type PolicyValidationError,
  type RateLimitRule,
} from '@fluxguard/contracts';
import { AlgorithmCapabilitiesRegistry } from '@fluxguard/contracts';
import { supportsWindowType } from '@fluxguard/contracts';

export function validateWindow(rule: RateLimitRule, errors: PolicyValidationError[]): void {
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

  if (!Object.prototype.hasOwnProperty.call(AlgorithmCapabilitiesRegistry, rule.execution.algorithm)) {
    return;
  }

  if (!supportsWindowType(rule.execution.algorithm, window.type)) {
    errors.push({
      path: ['rules', rule.id, 'quota', 'window'],
      message: `window type "${window.type}" is not supported by algorithm "${rule.execution.algorithm}"`,
    });
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

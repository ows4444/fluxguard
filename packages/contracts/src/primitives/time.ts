import { ParseErrorCode, type ParseResult } from './brand';

export function parseIanaTimezone(value: string): ParseResult<string> {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });

    return {
      ok: true,
      value: value,
    };
  } catch {
    return {
      ok: false,
      code: ParseErrorCode.InvalidTimezone,
      error: 'invalid IANA timezone',
    };
  }
}

export function parseCalendarDay(value: number): ParseResult<number> {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidCalendarDay,
      error: 'calendar day must be between 1 and 31',
    };
  }

  return {
    ok: true,
    value: value,
  };
}

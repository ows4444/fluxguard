import { ParseErrorCode, type ParseResult } from './brand';

function validateRoute(value: string, kind: 'route template' | 'route pattern'): ParseResult<string> {
  if (!value.startsWith('/')) {
    return {
      ok: false,
      code: ParseErrorCode.RouteMissingLeadingSlash,
      error: `${kind} must start with "/"`,
    };
  }

  if (value.includes('?')) {
    return {
      ok: false,

      code: ParseErrorCode.RouteContainsQuery,
      error: `${kind} must not contain query strings`,
    };
  }

  if (value.includes('#')) {
    return {
      ok: false,
      code: ParseErrorCode.RouteContainsFragment,
      error: `${kind} must not contain fragments`,
    };
  }

  if (/\s/u.test(value)) {
    return {
      ok: false,
      code: ParseErrorCode.RouteContainsWhitespace,
      error: `${kind} must not contain whitespace`,
    };
  }

  return { ok: true, value };
}

export function parseRouteTemplate(value: string): ParseResult<string> {
  return validateRoute(value, 'route template');
}

export function parseRoutePattern(value: string): ParseResult<string> {
  return validateRoute(value, 'route pattern');
}

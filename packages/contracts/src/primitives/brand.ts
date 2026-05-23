export interface ParseSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export const ParseErrorCode = Object.freeze({
  InvalidIpAddress: 'invalid_ip_address',
  InvalidCidr: 'invalid_cidr',
  InvalidCidrIp: 'invalid_cidr_ip',
  InvalidCidrPrefix: 'invalid_cidr_prefix',
  CidrPrefixOutOfRange: 'cidr_prefix_out_of_range',

  InvalidProbability: 'invalid_probability',
  InvalidPositiveFloat: 'invalid_positive_float',

  InvalidMilliseconds: 'invalid_milliseconds',
  InvalidMicroseconds: 'invalid_microseconds',

  InvalidTimezone: 'invalid_timezone',
  InvalidCalendarDay: 'invalid_calendar_day',

  RouteMissingLeadingSlash: 'route_missing_leading_slash',
  RouteContainsQuery: 'route_contains_query',
  RouteContainsFragment: 'route_contains_fragment',
  RouteContainsWhitespace: 'route_contains_whitespace',

  PositiveIntegerRequired: 'positive_integer_required',
  NonNegativeIntegerRequired: 'non_negative_integer_required',
} as const);

export type ParseErrorCode = (typeof ParseErrorCode)[keyof typeof ParseErrorCode];

export interface ParseFailure {
  readonly code: ParseErrorCode;
  readonly error: string;
  readonly ok: false;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

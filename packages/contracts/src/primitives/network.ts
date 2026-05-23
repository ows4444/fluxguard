import net from 'node:net';

import { ParseErrorCode, type ParseResult } from './brand';

export function parseIpAddress(value: string): ParseResult<string> {
  if (net.isIP(value) === 0) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidIpAddress,
      error: 'invalid ip address',
    };
  }

  return {
    ok: true,
    value: value,
  };
}

export function parseCidr(value: string): ParseResult<string> {
  const parts = value.split('/');

  if (parts.length !== 2) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidCidr,
      error: 'invalid cidr',
    };
  }

  const [ip, prefix] = parts;

  if (!ip || !prefix) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidCidr,
      error: 'invalid cidr',
    };
  }

  const ipVersion = net.isIP(ip);

  if (ipVersion === 0) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidCidrIp,
      error: 'invalid cidr ip',
    };
  }

  if (!/^(0|[1-9]\d*)$/u.test(prefix)) {
    return {
      ok: false,
      code: ParseErrorCode.InvalidCidrPrefix,
      error: 'invalid cidr prefix',
    };
  }

  const parsedPrefix = Number.parseInt(prefix, 10);

  const max = ipVersion === 6 ? 128 : 32;

  if (parsedPrefix < 0 || parsedPrefix > max) {
    return {
      ok: false,
      code: ParseErrorCode.CidrPrefixOutOfRange,
      error: 'cidr prefix out of range',
    };
  }

  return {
    ok: true,
    value: value,
  };
}

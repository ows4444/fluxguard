const MAX_KEY_LENGTH = 512;
const INVISIBLE_UNICODE_PATTERN = /[\u200B-\u200D\uFEFF]/u;

export function assertValidRateLimitKey(key: string): void {
  if (key.trim().length === 0) {
    throw new TypeError('Rate limit key cannot be empty');
  }

  if (/[\u0000-\u001F]/u.test(key)) {
    throw new TypeError('Rate limit key contains control characters');
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new RangeError(`Rate limit key exceeds maximum length of ${MAX_KEY_LENGTH}`);
  }
}

export interface BuildStorageKeyOptions {
  readonly key: string;
  readonly limiter: string;
  readonly namespace: string;
}

function normalizeStorageKeyPart(value: string): string {
  const normalized = value.normalize('NFC').trim();

  if (INVISIBLE_UNICODE_PATTERN.test(normalized)) {
    throw new TypeError('Storage key contains invisible Unicode characters');
  }

  return normalized;
}

function assertNonEmptyKeyPart(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} cannot be empty`);
  }

  if (value.includes(':')) {
    throw new TypeError(`${field} cannot contain ":"`);
  }
}

export function buildStorageKey(options: BuildStorageKeyOptions): string {
  const namespace = normalizeStorageKeyPart(options.namespace);
  const limiter = normalizeStorageKeyPart(options.limiter);
  const key = normalizeStorageKeyPart(options.key);

  assertNonEmptyKeyPart(namespace, 'namespace');
  assertNonEmptyKeyPart(limiter, 'limiter');
  assertNonEmptyKeyPart(key, 'key');

  const storageKey = `${namespace}:${limiter}:${key}`;

  assertValidRateLimitKey(storageKey);
  return storageKey;
}

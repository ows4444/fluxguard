const MAX_KEY_LENGTH = 512;

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
  return value.normalize('NFKC').trim();
}

function assertNonEmptyKeyPart(value: string, field: string): void {
  if (value.length === 0) {
    throw new TypeError(`${field} cannot be empty`);
  }
}

export function buildStorageKey(options: BuildStorageKeyOptions): string {
  const namespace = normalizeStorageKeyPart(options.namespace);
  const limiter = normalizeStorageKeyPart(options.limiter);
  const key = normalizeStorageKeyPart(options.key);

  assertNonEmptyKeyPart(namespace, 'namespace');
  assertNonEmptyKeyPart(limiter, 'limiter');
  assertNonEmptyKeyPart(key, 'key');

  return `${namespace}:${limiter}:${key}`;
}

import { REQUEST_METADATA_LIMITS, type RequestMetadata } from './runtime.contract';

export function validateRequestMetadata(metadata: RequestMetadata): boolean {
  const prototype = Object.getPrototypeOf(metadata) as unknown;

  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  const entries = Object.entries(metadata);

  if (entries.length > REQUEST_METADATA_LIMITS.maxEntries) {
    return false;
  }

  for (const [key, value] of entries) {
    if (!key.startsWith('x-') || key.length < 3) {
      return false;
    }

    if (value.length === 0) {
      return false;
    }

    if (/[\r\n]/u.test(value)) {
      return false;
    }

    if (key.length > REQUEST_METADATA_LIMITS.maxKeyLength) {
      return false;
    }

    if (value.length > REQUEST_METADATA_LIMITS.maxValueLength) {
      return false;
    }
  }

  return true;
}

import type { DeepReadonly } from './immutable';

export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): DeepReadonly<T> {
  if (typeof value !== 'object' || value === null) {
    return value as DeepReadonly<T>;
  }

  if (seen.has(value)) {
    return value as DeepReadonly<T>;
  }

  if (ArrayBuffer.isView(value)) {
    return value as DeepReadonly<T>;
  }

  seen.add(value);

  if (value instanceof Map) {
    for (const [key, nestedValue] of value.entries()) {
      deepFreeze(key, seen);
      deepFreeze(nestedValue, seen);
    }
  }

  if (value instanceof Set) {
    for (const nestedValue of value.values()) {
      deepFreeze(nestedValue, seen);
    }
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const descriptor of Object.values(descriptors)) {
    if (!('value' in descriptor)) {
      continue;
    }

    const nested = descriptor.value as unknown;

    if (typeof nested === 'object' && nested !== null && !Object.isFrozen(nested)) {
      deepFreeze(nested, seen);
    }
  }

  Object.freeze(value);

  return value as DeepReadonly<T>;
}

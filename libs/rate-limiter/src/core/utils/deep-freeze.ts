export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): Readonly<T> {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Object.isFrozen(value)) {
    return value;
  }

  if (seen.has(value as object)) {
    return value;
  }

  seen.add(value as object);

  const propertyNames = Object.getOwnPropertyNames(value);

  for (const name of propertyNames) {
    const property = (value as Record<string, unknown>)[name];

    if (property && typeof property === 'object') {
      deepFreeze(property, seen);
    }
  }

  return Object.freeze(value);
}

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

export function assertSafeInteger(value: number, type: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${type} must be a safe integer`);
  }
}

export function safeIntegerAdd(left: number, right: number, type: string): number {
  const result = left + right;

  assertSafeInteger(result, type);

  return result;
}

export function safeIntegerMultiply(value: number, multiplier: number, type: string): number {
  const result = Math.trunc(value * multiplier);

  assertSafeInteger(result, type);

  return result;
}

export function safeIntegerSubtract(left: number, right: number, type: string): number {
  const result = left - right;

  assertSafeInteger(result, type);

  return result;
}

export function assertWithinSafeIntegerRange(value: number, type: string): void {
  if (Math.abs(value) > MAX_SAFE_INTEGER) {
    throw new RangeError(`${type} exceeds safe integer range`);
  }
}

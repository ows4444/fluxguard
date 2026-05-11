export function optionalProp<TKey extends string, TValue>(
  key: TKey,
  value: TValue | undefined,
): Partial<Record<TKey, TValue>> {
  if (value === undefined) {
    return {};
  }

  return {
    [key]: value,
  } as Partial<Record<TKey, TValue>>;
}

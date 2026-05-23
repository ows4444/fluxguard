export function mapObjectValues<TObject extends Record<string, unknown>, TValue>(
  object: TObject,
  mapper: (value: TObject[keyof TObject], key: keyof TObject) => TValue,
): { [K in keyof TObject]: TValue } {
  const entries = Object.entries(object) as Array<[keyof TObject, TObject[keyof TObject]]>;

  return Object.fromEntries(entries.map(([key, value]) => [key, mapper(value, key)])) as {
    [K in keyof TObject]: TValue;
  };
}

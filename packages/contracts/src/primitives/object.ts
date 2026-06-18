export function mapObjectValues<TObject extends Record<string, unknown>, TValue>(
  object: TObject,
  mapper: (value: TObject[keyof TObject], key: keyof TObject) => TValue,
): { [K in keyof TObject]: TValue } {
  const entries = Object.entries(object) as Array<[keyof TObject, TObject[keyof TObject]]>;

  return Object.fromEntries(entries.map(([key, value]) => [key, mapper(value, key)])) as {
    [K in keyof TObject]: TValue;
  };
}

export function pickSchemaVersions<T extends Record<string, { readonly schemaVersion: number }>>(registry: T) {
  return Object.freeze(
    Object.fromEntries(Object.entries(registry).map(([key, value]) => [key, value.schemaVersion])),
  ) as {
    readonly [K in keyof T]: T[K]['schemaVersion'];
  };
}

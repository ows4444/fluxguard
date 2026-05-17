export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonArray = ReadonlyArray<JsonValue>;

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

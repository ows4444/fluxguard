export type RateLimitMetadata<T extends string> = T | RateLimitEntry<T>;

export interface RateLimitEntry<T extends string> {
  name: T;
}

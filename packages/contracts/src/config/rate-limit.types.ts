export const RATE_LIMIT_KIND = {
  QUOTA: 'quota',
  COOLDOWN: 'cooldown',
} as const;

export type RateLimitKind = (typeof RATE_LIMIT_KIND)[keyof typeof RATE_LIMIT_KIND];
export const QUOTA_ALGORITHM = {
  FIXED: 'fixed',
  GCRA: 'gcra',
} as const;

export type QuotaAlgorithm = (typeof QUOTA_ALGORITHM)[keyof typeof QUOTA_ALGORITHM];

declare const validatedRateLimitConfigBrand: unique symbol;

export type Validated<T> = T & {
  readonly [validatedRateLimitConfigBrand]: true;
};

export function markValidated<T>(value: T): Validated<T> {
  return value as Validated<T>;
}

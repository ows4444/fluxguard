declare const rateLimitPointsBrand: unique symbol;
declare const priorityBrand: unique symbol;
declare const remainingRateLimitPointsBrand: unique symbol;
declare const consumedRateLimitPointsBrand: unique symbol;

export type RateLimitPoints = number & {
  readonly [rateLimitPointsBrand]: 'RateLimitPoints';
};
export type Priority = number & {
  readonly [priorityBrand]: 'Priority';
};

export type RemainingRateLimitPoints = number & {
  readonly [remainingRateLimitPointsBrand]: 'RemainingRateLimitPoints';
};

export type ConsumedRateLimitPoints = number & {
  readonly [consumedRateLimitPointsBrand]: 'ConsumedRateLimitPoints';
};

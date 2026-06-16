export const Algorithm = Object.freeze({
  FixedWindow: 'fixed-window',
  SlidingWindowLog: 'sliding-window-log',
  SlidingWindowCounter: 'sliding-window-counter',
  TokenBucket: 'token-bucket',
  LeakyBucket: 'leaky-bucket',
  GCRA: 'gcra',
} as const);

export type RateLimitAlgorithmId = (typeof Algorithm)[keyof typeof Algorithm];

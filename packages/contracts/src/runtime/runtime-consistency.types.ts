export const PEEK_CONSISTENCY = {
  ADVISORY: 'advisory',
  CONSISTENT: 'consistent',
} as const;

export type PeekConsistency = (typeof PEEK_CONSISTENCY)[keyof typeof PEEK_CONSISTENCY];

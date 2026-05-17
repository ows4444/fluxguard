export const RUNTIME_OPERATION = {
  CONSUME: 'consume',
  PEEK: 'peek',
  ADJUST: 'adjust',
} as const;

export type RuntimeOperation = (typeof RUNTIME_OPERATION)[keyof typeof RUNTIME_OPERATION];

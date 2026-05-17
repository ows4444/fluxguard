export const RUNTIME_STATE = {
  ACTIVE: 'ACTIVE',
  SHUTTING_DOWN: 'SHUTTING_DOWN',
  SHUTDOWN: 'SHUTDOWN',
} as const;

export type RuntimeState = (typeof RUNTIME_STATE)[keyof typeof RUNTIME_STATE];

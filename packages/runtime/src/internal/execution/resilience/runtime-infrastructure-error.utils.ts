const INFRASTRUCTURE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

const REDIS_INFRASTRUCTURE_MESSAGES = [
  'READONLY',
  'CLUSTERDOWN',
  'NOSCRIPT',
  'Connection is closed',
  'Connection lost',
  'Socket closed unexpectedly',
];

export function isInfrastructureError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.name === 'RuntimeInfrastructureError' ||
    error.name === 'RuntimeCircuitBreakerOpenError' ||
    error.name === 'RuntimeTimeoutError'
  ) {
    return true;
  }

  const nodeError = error as NodeJS.ErrnoException;

  if (nodeError.code && INFRASTRUCTURE_ERROR_CODES.has(nodeError.code)) {
    return true;
  }

  return REDIS_INFRASTRUCTURE_MESSAGES.some((message) => error.message.includes(message));
}

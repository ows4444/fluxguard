export function calculateRetryAfterMs(nowMs: number, nextAllowedAtMs?: number): number {
  if (nextAllowedAtMs === undefined) {
    return 0;
  }

  return Math.max(0, nextAllowedAtMs - nowMs);
}

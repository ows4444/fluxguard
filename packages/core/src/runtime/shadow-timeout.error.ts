export class ShadowTimeoutExceededError extends Error {
  constructor(timeoutMs: number) {
    super(`Shadow evaluation exceeded ${timeoutMs}ms`);
  }
}

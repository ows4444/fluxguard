export function assertNotAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) {
    return;
  }

  throw signal.reason instanceof Error ? signal.reason : new Error('Operation aborted');
}

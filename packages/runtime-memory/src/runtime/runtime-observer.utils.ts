export interface ObserverDiagnostics {
  onObserverFailure?(
    error: unknown,
    context: {
      readonly correlationId?: string;
      readonly key?: string;
      readonly operation: string;
    },
  ): void;
}

export function safelyExecuteObserver(
  callback: () => void,
  diagnostics?: ObserverDiagnostics,
  context?: {
    readonly correlationId?: string;
    readonly key?: string;
    readonly operation: string;
  },
): void {
  try {
    callback();
  } catch (error) {
    diagnostics?.onObserverFailure?.(error, context);
    /**
     * Observability MUST NOT affect runtime correctness.
     *
     * Intentionally swallowed.
     */
  }
}

export interface ErrorReporter {
  report(error: unknown): void;
}

export class NoopErrorReporter implements ErrorReporter {
  report(_error: unknown): void {
    //
  }
}

export class RuntimeExecutionAbortedError extends Error {
  override readonly name = 'RuntimeExecutionAbortedError';

  constructor() {
    super('Runtime execution aborted');
  }
}

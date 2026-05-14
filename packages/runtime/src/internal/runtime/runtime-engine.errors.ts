export class RuntimeEngineDestroyedError extends Error {
  constructor() {
    super('Runtime engine has been destroyed');

    this.name = 'RuntimeEngineDestroyedError';
  }
}

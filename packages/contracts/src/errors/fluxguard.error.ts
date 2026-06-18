export abstract class FluxGuardError extends Error {
  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = new.target.name;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

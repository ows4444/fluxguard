import { FluxGuardError } from '../errors/fluxguard.error';

export class UnsupportedStoreModeError extends FluxGuardError {
  constructor(
    public readonly requestedMode: string,
    public readonly supportedModes: readonly string[],
  ) {
    super(`Store mode "${requestedMode}" is not supported. Supported modes: ${supportedModes.join(', ')}`);
  }
}

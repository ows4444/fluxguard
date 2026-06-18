import { FluxGuardError } from '@fluxguard/contracts';

export class EventPublishError extends FluxGuardError {
  constructor(
    public readonly eventType: string,
    cause: unknown,
  ) {
    super(`Failed to publish ${eventType}`, { cause });
  }
}

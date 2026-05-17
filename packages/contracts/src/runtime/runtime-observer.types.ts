import type { RuntimeDecisionEvent, RuntimeFailureEvent } from '../events';

export interface RuntimeObserver {
  onDecision?(event: RuntimeDecisionEvent): void;

  onFailure?(event: RuntimeFailureEvent): void;
}

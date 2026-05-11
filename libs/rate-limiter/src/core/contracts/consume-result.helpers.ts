import { DecisionOutcome } from './decision-outcome';
import { ConsumeResult } from './result.types';

export class ConsumeResultHelper {
  static fromAllowed(allowed: boolean): DecisionOutcome {
    return allowed ? DecisionOutcome.ALLOWED : DecisionOutcome.REJECTED;
  }

  static fromBlocked(blocked: boolean, allowed: boolean): DecisionOutcome {
    if (blocked) {
      return DecisionOutcome.BLOCKED;
    }

    return this.fromAllowed(allowed);
  }

  static isAllowed(result: ConsumeResult): boolean {
    return result.outcome === DecisionOutcome.ALLOWED || result.outcome === DecisionOutcome.DEGRADED_ALLOWED;
  }

  static isRejected(result: ConsumeResult): boolean {
    return result.outcome === DecisionOutcome.REJECTED || result.outcome === DecisionOutcome.DEGRADED_REJECTED;
  }

  static isBlocked(result: ConsumeResult): boolean {
    return result.outcome === DecisionOutcome.BLOCKED;
  }

  static isDegraded(result: ConsumeResult): boolean {
    return result.outcome === DecisionOutcome.DEGRADED_ALLOWED || result.outcome === DecisionOutcome.DEGRADED_REJECTED;
  }

  static shouldStop(result: ConsumeResult): boolean {
    return !this.isAllowed(result);
  }
}

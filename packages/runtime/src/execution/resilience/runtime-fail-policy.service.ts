import type { FailBehavior } from '@fluxguard/contracts';

export class RuntimeFailPolicyService {
  shouldAllowOnFailure(behavior: FailBehavior | undefined): boolean {
    return behavior === 'open';
  }
}

import { Injectable } from '@nestjs/common';
import { FailBehavior } from '../module/rate-limiter.interfaces';

interface FailurePolicyConfig {
  critical?: boolean;

  failBehavior?: FailBehavior;
}

@Injectable()
export class LimiterFailurePolicyService {
  shouldFailClosed(config: FailurePolicyConfig, globalBehavior: FailBehavior): boolean {
    if (config.critical) {
      return true;
    }
    const behavior = config.failBehavior ?? globalBehavior;

    return behavior === 'closed';
  }
}

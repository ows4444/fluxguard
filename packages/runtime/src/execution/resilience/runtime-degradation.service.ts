import type { ConsumeResult } from '@fluxguard/contracts';

import { degradedAllowedResult, degradedRejectedResult } from '../../results/index';

export class RuntimeDegradationService {
  createAllowedResult(key: string): ConsumeResult {
    return degradedAllowedResult(key);
  }

  createRejectedResult(key: string): ConsumeResult {
    return degradedRejectedResult(key);
  }
}

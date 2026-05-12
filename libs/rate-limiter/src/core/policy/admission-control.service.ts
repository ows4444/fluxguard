import { Injectable } from '@nestjs/common';

import { HotKeyShieldService } from './hot-key-shield.service';

import type { ConsumeResult } from '../contracts/result.types';

import { ResultFactory } from '../contracts/result.factory';

@Injectable()
export class AdmissionControlService {
  constructor(private readonly hotKeyShield: HotKeyShieldService) {}

  evaluate(key: string): ConsumeResult | null {
    const hotness = this.hotKeyShield.record(key);

    if (!this.hotKeyShield.shouldMitigate(hotness)) {
      return null;
    }

    if (!this.hotKeyShield.probabilisticReject(key)) {
      return null;
    }

    return ResultFactory.degradedRejected(key, 1000);
  }

  hotness(key: string): number {
    return this.hotKeyShield.record(key);
  }

  shouldLogHotKey(hotness: number): boolean {
    return hotness >= 5000;
  }
}

import { Injectable } from '@nestjs/common';

import { MonotonicTimeSource } from './contracts';

@Injectable()
export class MonotonicClockService implements MonotonicTimeSource {
  private readonly startedAt = Date.now();

  private readonly startedHr = process.hrtime.bigint();

  nowMs(): number {
    const elapsedNs = process.hrtime.bigint() - this.startedHr;

    return this.startedAt + Number(elapsedNs / 1_000_000n);
  }
}

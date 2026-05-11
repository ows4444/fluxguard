import { Injectable } from '@nestjs/common';
import { Probabilistic } from '../utils/probabilistic';

@Injectable()
export class DegradedModeService {
  private readonly resolution = 100_000;

  allow(key: string, limitPerSecond: number, now: number): boolean {
    if (limitPerSecond <= 0) {
      return false;
    }

    const epochSecond = Math.floor(now / 1000);

    const bucket = `${key}:${epochSecond}`;

    const normalizedRate = Math.max(0, Math.min(1, limitPerSecond / this.resolution));

    const threshold = Math.floor(normalizedRate * this.resolution);

    return Probabilistic.threshold(bucket, this.resolution, threshold);
  }
}

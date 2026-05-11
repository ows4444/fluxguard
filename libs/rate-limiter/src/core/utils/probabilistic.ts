import { fnv1a } from './fnv1a';

export class Probabilistic {
  static threshold(input: string, resolution: number, threshold: number): boolean {
    if (resolution <= 0) {
      return false;
    }

    if (threshold <= 0) {
      return false;
    }

    if (threshold >= resolution) {
      return true;
    }

    return fnv1a(input) % resolution < threshold;
  }

  static percentage(input: string, percentage: number): boolean {
    const normalized = Math.max(0, Math.min(100, percentage));

    return this.threshold(input, 100, normalized);
  }

  static sample(input: string, sampleRate: number): boolean {
    if (sampleRate <= 1) {
      return true;
    }

    return fnv1a(input) % sampleRate === 0;
  }

  static ratio(input: string, numerator: number, denominator: number): boolean {
    return this.threshold(input, denominator, numerator);
  }
}

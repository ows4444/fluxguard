import type { RuntimeBlockingPolicy, RuntimeProgressiveBlockingPolicy } from '../../config/index';

export class BlockDurationStrategy {
  calculate(
    violations: number,
    blocking: RuntimeBlockingPolicy | undefined,

    progressive: RuntimeProgressiveBlockingPolicy | undefined,
  ): number {
    if (!blocking || blocking.blockDurationSeconds <= 0) {
      return 0;
    }

    if (!progressive?.enabled) {
      return blocking.blockDurationSeconds * 1000;
    }

    const multiplier = Math.pow(progressive.multiplier, Math.max(0, violations - 1));

    const duration = progressive.initialBlockSeconds * multiplier;

    return Math.min(duration, progressive.maxBlockSeconds) * 1000;
  }
}

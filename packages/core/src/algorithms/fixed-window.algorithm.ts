import {
  type ConsumeCommand,
  DEFAULT_REQUEST_COST,
  isFixedWindow,
  StoreFailureError,
  windowToMs,
} from '@fluxguard/contracts';

import type { EvaluationContext } from '../runtime/evaluation-context';
import type { AlgorithmResult } from './algorithm.contract';
import { UnsupportedAlgorithmWindowError } from './algorithm-registry.errors';
import { BaseRateLimitAlgorithm } from './base.algorithm';

export class FixedWindowAlgorithm extends BaseRateLimitAlgorithm {
  override readonly supportsShadowEvaluation = true;
  async evaluate(context: EvaluationContext): Promise<AlgorithmResult> {
    const window = context.rule.quota.window;

    if (!isFixedWindow(window)) {
      throw new UnsupportedAlgorithmWindowError(context.rule.id, window.type, 'fixed-window');
    }

    const windowMs = windowToMs(window);

    const windowStart = context.clock.windowStartMs(windowMs);

    const command: ConsumeCommand = {
      key: context.key,
      cost: context.request.cost ?? DEFAULT_REQUEST_COST,

      limit: context.rule.quota.limit,
      mode: 'counter',
      nowMs: context.clock.nowMs(),
      windowMs,
      resetAtMs: windowStart + windowMs,
      ...(context.idempotencyKey !== undefined
        ? { idempotencyKey: context.idempotencyKey, idempotencyTtlMs: windowMs }
        : {}),
    };

    const result = await context.store.consume(command);

    if (!result.ok) {
      throw new StoreFailureError(result);
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
      ...(result.nextAllowedAtMs !== undefined ? { nextAllowedAtMs: result.nextAllowedAtMs } : {}),
    };
  }
}

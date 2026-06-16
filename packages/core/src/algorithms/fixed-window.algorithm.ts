import {
  type ConsumeCommand,
  DEFAULT_REQUEST_COST,
  isFixedWindow,
  StoreFailureError,
  windowToMs,
} from '@fluxguard/contracts';

import type { EvaluationContext } from '../runtime/evaluation-context';
import type { AlgorithmResult, RateLimitAlgorithm } from './algorithm.contract';

export class FixedWindowAlgorithm implements RateLimitAlgorithm {
  async evaluate(context: EvaluationContext): Promise<AlgorithmResult> {
    const window = context.rule.quota.window;

    if (!isFixedWindow(window)) {
      throw new Error('FixedWindowAlgorithm requires fixed-window policy');
    }

    const windowMs = windowToMs(window);

    const command: ConsumeCommand = {
      key: context.key,
      cost: context.request.cost ?? DEFAULT_REQUEST_COST,
      idempotencyKey: context.idempotencyKey,
      idempotencyTtlMs: windowMs,
      limit: context.rule.quota.limit,
      mode: 'counter',
      nowMs: context.clock.nowMs(),
      windowMs,
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

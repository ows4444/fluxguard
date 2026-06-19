import {
  type ConsumeCommand,
  DEFAULT_REQUEST_COST,
  isFixedWindow,
  StoreFailureError,
  windowToMs,
} from '@fluxguard/contracts';

import type { EvaluationContext } from '../runtime/evaluation-context';
import type { ShadowEvaluationContext } from '../runtime/shadow-evaluation-context';
import type { AlgorithmResult } from './algorithm.contract';
import { UnsupportedAlgorithmWindowError } from './algorithm-registry.errors';
import { BaseRateLimitAlgorithm } from './base.algorithm';

interface CommonEvaluationFields {
  readonly key: string;
  readonly clock: EvaluationContext['clock'];
  readonly idempotencyKey?: string;
  readonly request: EvaluationContext['request'];
  readonly rule: EvaluationContext['rule'];
}

export class FixedWindowAlgorithm extends BaseRateLimitAlgorithm {
  override readonly supportsShadowEvaluation = true;

  private buildConsumeCommand(context: CommonEvaluationFields): ConsumeCommand {
    const window = context.rule.quota.window;

    if (!isFixedWindow(window)) {
      throw new UnsupportedAlgorithmWindowError(context.rule.id, window.type, 'fixed-window');
    }

    const windowMs = windowToMs(window);
    const nowMs = context.clock.nowMs();
    const windowStart = Math.floor(nowMs / windowMs) * windowMs;

    return {
      key: context.key,
      cost: context.request.cost ?? DEFAULT_REQUEST_COST,
      limit: context.rule.quota.limit,
      mode: 'counter',
      nowMs,
      windowMs,
      resetAtMs: windowStart + windowMs,
      ...(context.idempotencyKey !== undefined
        ? { idempotencyKey: context.idempotencyKey, idempotencyTtlMs: windowMs }
        : {}),
    };
  }

  async evaluate(context: EvaluationContext): Promise<AlgorithmResult> {
    const command = this.buildConsumeCommand(context);
    const result = await context.store.consume(command);

    if (!result.ok) {
      throw new StoreFailureError(result);
    }

    return {
      allowed: result.allowed,
      fromIdempotencyCache: result.fromIdempotencyCache,
      fromReplica: result.fromReplica,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
      ...(result.nextAllowedAtMs !== undefined ? { nextAllowedAtMs: result.nextAllowedAtMs } : {}),
    };
  }

  override async evaluateShadow(context: ShadowEvaluationContext): Promise<void> {
    const command = this.buildConsumeCommand(context);
    const result = await context.store.consume(command);

    if (!result.ok) {
      throw new StoreFailureError(result);
    }
  }
}

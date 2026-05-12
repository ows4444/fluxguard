import { Inject, Injectable, Logger } from '@nestjs/common';

import type { RateLimitAdjustmentOptions, RateLimitContext } from '../module/rate-limiter.interfaces';

import { LimiterRegistry, RegisteredLimiter } from './registry';

import { RateLimitKeyBuilder } from './key-builder';

import { LimiterFailurePolicyService } from './limiter-failure-policy.service';

import { LimiterEventPublisher } from './limiter-event-publisher';

import { RateLimiterInfrastructureError } from '../errors/rate-limiter.errors';

import { CircuitBreakerService } from './policy/circuit-breaker.service';

import { DegradedModeService } from './policy/degraded-mode.service';

import { RATE_LIMITER_OPTIONS } from '../module/rate-limiter.constants';

import type { RateLimiterModuleOptions } from '../module/rate-limiter.interfaces';

import { RedisScriptRegistry } from '../redis/script-registry';

import { MonotonicClockService } from './time/monotonic.time';
import { HybridClockService } from './time/hybrid-clock.service';
import { RedisErrorClassifier } from '../redis/redis-error-classifier';

import { Probabilistic } from './utils/probabilistic';
import type { ConsumeResult, PeekResult, RuntimeDecision } from './contracts/result.types';
import { ResultFactory } from './contracts/result.factory';

import { optionalProp } from './utils/object.utils';
import { AdmissionControlService } from './policy/admission-control.service';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(
    private readonly registry: LimiterRegistry,

    private readonly failurePolicy: LimiterFailurePolicyService,

    private readonly publisher: LimiterEventPublisher,

    private readonly circuitBreaker: CircuitBreakerService,

    private readonly degradedMode: DegradedModeService,

    private readonly admissionControl: AdmissionControlService,

    private readonly scripts: RedisScriptRegistry,

    private readonly clockTime: HybridClockService,

    private readonly clock: MonotonicClockService,

    @Inject(RATE_LIMITER_OPTIONS)
    private readonly options: RateLimiterModuleOptions,
  ) {}

  async consume(limiterName: string, context: RateLimitContext, signal?: AbortSignal): Promise<RuntimeDecision> {
    const now = this.clockTime.nowMs();
    const registered = this.registry.get(limiterName);

    const key = this.resolveKey(limiterName, context, registered.identity);

    const breakerKey = `consume:${limiterName}:${registered.scope}`;

    if (this.circuitBreaker.isOpen(breakerKey, now)) {
      if (!this.circuitBreaker.allowProbe(breakerKey, now)) {
        return this.handleInfrastructureFailure(registered, limiterName, key, new Error('circuit_breaker_open'), now);
      }
    }

    const startedAt = performance.now();

    try {
      const result = await registered.algorithm.consume(key, signal);

      const admissionResult = this.admissionControl.evaluate(key);

      if (admissionResult) {
        return admissionResult;
      }

      const hotness = this.admissionControl.hotness(key);

      if (this.admissionControl.shouldLogHotKey(hotness)) {
        if (Probabilistic.sample(`${key}:${Math.floor(hotness / 1000)}`, 100)) {
          this.logger.warn(
            JSON.stringify({
              event: 'rate_limiter_hot_key',

              limiter: limiterName,

              hotness,

              keyHash: key.slice(0, 12),
            }),
          );
        }
      }

      this.circuitBreaker.recordSuccess(breakerKey);

      this.publishDecision(registered, key, result);

      this.recordLatency(limiterName, performance.now() - startedAt);

      return this.attachExposure(result, registered.exposure);
    } catch (err) {
      this.circuitBreaker.recordFailure(breakerKey, now);

      this.recordFailure(limiterName, err);

      const result = this.handleInfrastructureFailure(registered, limiterName, key, err, now);

      this.publishDecision(registered, key, result);

      return result;
    }
  }

  async reward(
    limiterName: string,
    context: RateLimitContext,
    options?: Omit<RateLimitAdjustmentOptions, 'key'>,
  ): Promise<void> {
    const registered = this.registry.get(limiterName);

    if (!registered.adjustments.allowManualAdjustments) {
      return;
    }

    const key = this.resolveKey(limiterName, context, registered.identity);

    if (!registered.algorithm.reward) {
      return;
    }

    await registered.algorithm.reward({
      key,

      ...optionalProp('operationId', options?.operationId),

      ...optionalProp('amount', options?.amount),

      ...optionalProp('reason', options?.reason),
    });
  }

  async penalty(
    limiterName: string,
    context: RateLimitContext,
    options?: Omit<RateLimitAdjustmentOptions, 'key'>,
  ): Promise<void> {
    const registered = this.registry.get(limiterName);

    if (!registered.adjustments.allowManualAdjustments) {
      return;
    }

    const key = this.resolveKey(limiterName, context, registered.identity);

    if (!registered.algorithm.penalty) {
      return;
    }

    await registered.algorithm.penalty({
      key,

      ...optionalProp('operationId', options?.operationId),

      ...optionalProp('amount', options?.amount),

      ...optionalProp('reason', options?.reason),
    });
  }

  async peekAdvisory(limiterName: string, context: RateLimitContext): Promise<PeekResult> {
    const registered = this.registry.get(limiterName);

    const key = this.resolveKey(limiterName, context, registered.identity);

    try {
      if (!registered.algorithm.peekAdvisory) {
        throw new Error(`Limiter "${registered.name}" does not support advisory peek`);
      }

      return await registered.algorithm.peekAdvisory(key);
    } catch (err) {
      this.recordFailure(limiterName, err);

      return this.buildDegradedPeekResult(registered, key);
    }
  }

  async peekConsistent(limiterName: string, context: RateLimitContext): Promise<PeekResult> {
    const registered = this.registry.get(limiterName);

    const key = this.resolveKey(limiterName, context, registered.identity);

    try {
      if (!registered.algorithm.peekConsistent) {
        throw new Error(`Limiter "${registered.name}" does not support consistent peek`);
      }

      return await registered.algorithm.peekConsistent(key);
    } catch (err) {
      this.recordFailure(registered.name, err);

      return ResultFactory.consistent(ResultFactory.degradedAllowed(key));
    }
  }

  private handleInfrastructureFailure(
    registered: RegisteredLimiter,
    limiterName: string,
    key: string,
    err: unknown,
    now: number,
  ): ConsumeResult {
    const failClosed = this.failurePolicy.shouldFailClosed(
      {
        critical: registered.resilience.critical,

        ...optionalProp('failBehavior', registered.resilience.failBehavior),
      },
      this.options.failBehavior ?? 'open',
    );

    if (failClosed) {
      throw new RateLimiterInfrastructureError(`Rate limiter failure: ${limiterName}`, err);
    }

    const classified = RedisErrorClassifier.classify(err);

    this.logger.warn(
      JSON.stringify({
        event: 'rate_limiter_fail_open',
        limiter: limiterName,
        key,
        errorType: classified.type,
        retryable: classified.retryable,
        topologyRelated: classified.topologyRelated,
      }),
    );

    const degradedAllowed = this.degradedMode.allow(
      `${limiterName}:${key}`,
      registered.resilience.degradedAllowancePerSecond,
      now,
    );

    if (!degradedAllowed) {
      return ResultFactory.degradedRejected(key, 1000);
    }

    return this.buildFailOpenResult(registered, key);
  }

  private buildFailOpenResult(registered: RegisteredLimiter, key: string): ConsumeResult {
    return ResultFactory.degradedAllowed(key);
  }

  private buildDegradedPeekResult(registered: RegisteredLimiter, key: string): PeekResult {
    return ResultFactory.advisory(ResultFactory.degradedAllowed(key));
  }

  private resolveKey(
    limiterName: string,
    context: RateLimitContext,
    config: {
      keySegments: readonly ('ip' | 'userId' | 'deviceId')[];

      allowKeyOverride?: boolean;

      ignoreKeyOverride: boolean;
    },
  ): string {
    return RateLimitKeyBuilder.build(limiterName, context, config);
  }

  private publishDecision(registered: RegisteredLimiter, key: string, result: ConsumeResult): void {
    this.publisher.publish(this.options.onDecision, {
      limiterName: registered.name,

      outcome: result.outcome,

      kind: registered.execution.limiterKind,

      remainingPoints: result.remainingPoints,

      msBeforeNext: result.msBeforeNext,

      key,
    });
  }

  private attachExposure(result: ConsumeResult, exposure: RegisteredLimiter['exposure']): RuntimeDecision {
    return {
      ...result,

      ...optionalProp('message', exposure.message),

      ...optionalProp('errorCode', exposure.errorCode),
    };
  }

  private recordLatency(limiterName: string, durationMs: number): void {
    if (durationMs < 50) {
      return;
    }

    this.logger.warn(
      ['High limiter latency detected', `limiter=${limiterName}`, `durationMs=${durationMs.toFixed(1)}`].join(' '),
    );
  }

  private recordFailure(limiterName: string, err: unknown): void {
    const classified = RedisErrorClassifier.classify(err);

    const sampleRate = classified.topologyRelated ? 1 : classified.retryable ? 25 : 100;

    const nowBucket = Math.floor(this.clock.nowMs() / 1000);

    if (!Probabilistic.sample(`${limiterName}:${nowBucket}`, sampleRate)) {
      return;
    }

    this.logger.error(
      JSON.stringify({
        event: 'limiter_execution_failed',
        limiter: limiterName,
        errorType: classified.type,
        retryable: classified.retryable,
      }),
    );
  }
}

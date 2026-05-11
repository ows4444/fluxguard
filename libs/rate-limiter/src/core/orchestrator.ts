import { Injectable, Logger } from '@nestjs/common';

import { LimiterRegistry } from './registry';

import { RateLimiterService } from './rate-limiter.service';

import { RateLimitResultSelector } from './rate-limit-result.selector';

import type {
  RateLimitAdjustmentOptions,
  RateLimitContext,
  RuntimeExposurePolicy,
} from '../module/rate-limiter.interfaces';

import type { RateLimitEntry } from './types';

import type { RegisteredLimiter } from './registry';
import { RateLimiterConfigurationError } from '../errors/rate-limiter.errors';
import { ParallelEvaluatorService } from './execution/parallel-evaluator';
import { ConsumeResultHelper } from './contracts/consume-result.helpers';
import { ConsumeResult } from './contracts/result.types';
import { optionalProp } from './utils/object.utils';

export interface OrchestratorEvaluateOptions {
  limiters: RateLimitEntry<string>[];

  context: RateLimitContext;

  skipGlobal: boolean;
}

interface EvaluatedResult {
  limiterName: string;

  result: ConsumeResult;

  priority: number;

  scopeKind: 'global' | 'route';

  kind: 'quota' | 'cooldown' | 'global';

  exposure: RuntimeExposurePolicy;
}

export interface OrchestratorResult {
  allowed: boolean;

  effectiveLimiter?: string;

  retryAfter?: number;

  remaining?: number | null;

  message?: string | ((retryAfter: number) => string);

  exposure?: RuntimeExposurePolicy;

  errorCode?: string;
}

@Injectable()
export class RateLimitOrchestrator {
  private readonly logger = new Logger(RateLimitOrchestrator.name);

  constructor(
    private readonly limiterService: RateLimiterService,

    private readonly registry: LimiterRegistry,

    private readonly selector: RateLimitResultSelector,

    private readonly parallel: ParallelEvaluatorService,
  ) {}

  async reward(
    limiterName: string,
    context: RateLimitContext,
    options?: Omit<RateLimitAdjustmentOptions, 'key'>,
  ): Promise<void> {
    const limiter = this.registry.get(limiterName);

    if (limiter.execution.enabled === false) {
      return;
    }

    if (limiter.execution.scopeKind === 'global') {
      return;
    }

    await this.limiterService.reward(limiterName, context, options);
  }

  async penalty(
    limiterName: string,
    context: RateLimitContext,
    options?: Omit<RateLimitAdjustmentOptions, 'key'>,
  ): Promise<void> {
    const limiter = this.registry.get(limiterName);

    if (limiter.execution.enabled === false) {
      return;
    }

    if (limiter.execution.scopeKind === 'global') {
      return;
    }

    await this.limiterService.penalty(limiterName, context, options);
  }

  async evaluate(options: OrchestratorEvaluateOptions): Promise<OrchestratorResult> {
    const plan = this.buildPlan(options);

    const globalLimiters = plan.filter((x) => x.execution.scopeKind === 'global');

    const remainingLimiters = plan.filter((x) => x.execution.scopeKind !== 'global');

    const evaluations: EvaluatedResult[] = [];

    const globalEvaluations = await this.evaluateStage(globalLimiters, options.context);

    evaluations.push(...globalEvaluations);

    if (globalEvaluations.some((x) => ConsumeResultHelper.shouldStop(x.result))) {
      return this.buildBlockedResult(evaluations);
    }

    const routeEvaluations = await this.evaluateStage(remainingLimiters, options.context);

    evaluations.push(...routeEvaluations);

    if (routeEvaluations.some((x) => ConsumeResultHelper.shouldStop(x.result))) {
      return this.buildBlockedResult(evaluations);
    }

    return this.buildSuccessResult(evaluations);
  }

  private async evaluateStage(
    limiters: readonly RegisteredLimiter[],
    context: RateLimitContext,
  ): Promise<EvaluatedResult[]> {
    const results = await this.parallel.evaluate(
      limiters.map((limiter) => ({
        key: limiter.name,

        timeoutMs: limiter.execution.timeoutMs,

        execute: async ({ signal }) => {
          const result = await this.limiterService.consume(limiter.name, context, signal);

          return {
            limiter,
            result,
          };
        },
      })),
    );

    const evaluations: EvaluatedResult[] = [];

    for (const item of results) {
      if (item.error) {
        if (item.error instanceof Error) {
          throw item.error;
        }

        throw new Error(String(JSON.stringify(item.error)));
      }

      if (!item.value) {
        continue;
      }

      evaluations.push({
        limiterName: item.value.limiter.name,

        exposure: item.value.limiter.exposure,

        result: item.value.result,

        priority: item.value.limiter.execution.priority,

        scopeKind: item.value.limiter.execution.scopeKind,

        kind: item.value.limiter.execution.limiterKind,
      });
    }

    return evaluations;
  }

  private buildPlan(options: OrchestratorEvaluateOptions): RegisteredLimiter[] {
    const deduped = new Set<string>();
    const MAX_LIMITERS_PER_ROUTE = 16;

    const resolved: RegisteredLimiter[] = [];

    for (const entry of options.limiters) {
      if (resolved.length >= MAX_LIMITERS_PER_ROUTE) {
        throw new RateLimiterConfigurationError(`Too many limiters configured on route (${MAX_LIMITERS_PER_ROUTE})`);
      }

      if (deduped.has(entry.name)) {
        continue;
      }

      deduped.add(entry.name);

      const limiter = this.registry.get(entry.name);

      if (limiter.execution.enabled === false) {
        continue;
      }

      if (options.skipGlobal && limiter.execution.scopeKind === 'global') {
        continue;
      }

      resolved.push(limiter);
    }

    resolved.sort((a, b) => {
      if (a.execution.priority !== b.execution.priority) {
        return a.execution.priority - b.execution.priority;
      }

      return a.name.localeCompare(b.name);
    });

    return resolved;
  }

  private buildBlockedResult(evaluations: readonly EvaluatedResult[]): OrchestratorResult {
    const blocked = evaluations.filter((entry) => !ConsumeResultHelper.isAllowed(entry.result));

    const selected = this.selector.selectBlocked(
      blocked.map((entry) => ({
        limiterName: entry.limiterName,

        retryAfter: this.toSeconds(entry.result.msBeforeNext),

        priority: entry.priority,

        kind: entry.kind,

        scopeKind: entry.scopeKind,

        exposeRemaining: true,
      })),
    );

    const selectedResult = blocked.find((entry) => entry.limiterName === selected.limiterName);

    return {
      allowed: false,

      effectiveLimiter: selected.limiterName,

      retryAfter: selected.retryAfter,

      remaining: selected.exposeRemaining ? (selectedResult?.result.remainingPoints ?? 0) : null,

      message: this.resolveMessage(selectedResult?.exposure.message, selected.retryAfter),

      errorCode: selectedResult?.exposure.errorCode ?? 'RATE_LIMITED',

      ...optionalProp('exposure', selectedResult?.exposure),
    };
  }

  private resolveMessage(message: string | ((retryAfter: number) => string) | undefined, retryAfter: number): string {
    if (!message) {
      return 'Rate limit exceeded';
    }

    if (typeof message === 'function') {
      try {
        return message(retryAfter);
      } catch {
        return 'Rate limit exceeded';
      }
    }

    return message;
  }

  private buildSuccessResult(evaluations: readonly EvaluatedResult[]): OrchestratorResult {
    let effectiveLimiter: string | undefined;

    let lowestRemaining: number | null = null;

    for (const evaluation of evaluations) {
      const remaining = evaluation.result.remainingPoints;

      if (remaining === null || remaining === undefined) {
        continue;
      }

      if (lowestRemaining === null || remaining < lowestRemaining) {
        lowestRemaining = remaining;

        effectiveLimiter = evaluation.limiterName;

        continue;
      }

      if (remaining === lowestRemaining && effectiveLimiter && evaluation.limiterName < effectiveLimiter) {
        effectiveLimiter = evaluation.limiterName;
      }
    }

    const exposure = evaluations.find((x) => x.limiterName === effectiveLimiter)?.exposure;

    return {
      allowed: true,

      remaining: lowestRemaining,

      ...optionalProp('effectiveLimiter', effectiveLimiter),

      ...optionalProp('exposure', exposure),
    };
  }

  private toSeconds(ms: number): number {
    if (ms <= 0) {
      return 1;
    }

    return Math.ceil(ms / 1000);
  }
}

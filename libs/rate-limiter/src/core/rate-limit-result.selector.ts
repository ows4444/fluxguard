import { Injectable } from '@nestjs/common';

import { RateLimiterConsistencyError } from '../errors/rate-limiter.errors';

export interface BlockedResult {
  limiterName: string;

  retryAfter: number;

  priority: number;

  kind: 'cooldown' | 'quota' | 'global';

  scopeKind: 'global' | 'route';

  exposeRemaining: boolean;
}

const KIND_RANK: Record<BlockedResult['kind'], number> = Object.freeze({
  global: 0,
  cooldown: 1,
  quota: 2,
});

@Injectable()
export class RateLimitResultSelector {
  selectBlocked(results: readonly BlockedResult[]): BlockedResult {
    if (results.length === 0) {
      throw new RateLimiterConsistencyError('Cannot select blocked limiter from empty result set');
    }

    const first = results[0];

    if (!first) {
      throw new RateLimiterConsistencyError('Cannot select blocked limiter from empty result set');
    }

    let selected = this.sanitize(first);

    for (let i = 1; i < results.length; i += 1) {
      const candidate = results[i];

      if (!candidate) {
        continue;
      }

      const current = this.sanitize(candidate);

      if (this.shouldReplace(selected, current)) {
        selected = current;
      }
    }

    return selected;
  }

  private shouldReplace(current: BlockedResult, candidate: BlockedResult): boolean {
    const currentKindRank = KIND_RANK[current.kind];

    const candidateKindRank = KIND_RANK[candidate.kind];

    if (candidateKindRank < currentKindRank) {
      return true;
    }

    if (candidateKindRank > currentKindRank) {
      return false;
    }

    if (candidate.priority < current.priority) {
      return true;
    }

    if (candidate.priority > current.priority) {
      return false;
    }

    if (candidate.retryAfter > current.retryAfter) {
      return true;
    }

    if (candidate.retryAfter < current.retryAfter) {
      return false;
    }

    return candidate.limiterName < current.limiterName;
  }

  private sanitize(result: BlockedResult): BlockedResult {
    return {
      ...result,

      retryAfter: Math.max(1, Math.floor(result.retryAfter)),

      priority: Math.max(0, Math.floor(result.priority)),
    };
  }
}

import type {
  BypassReason,
  IBypassTokenVerifier,
  RateLimitBypassPolicy,
  RateLimitRequest,
  RateLimitRule,
} from '@fluxguard/contracts';

import { BYPASS_TOKEN_META_KEY } from '../constants/bypass.constants';
import { isInCidr } from '../util/cidr';

export interface BypassMatch {
  readonly reason: BypassReason;
}

export class BypassChecker {
  private static readonly MAX_CACHE_ENTRIES = 1000;
  private readonly exemptUserCache = new Map<string, ReadonlySet<string>>();

  private getExemptUserSet(
    policyId: string,
    policyVersion: number | undefined,
    ids: ReadonlyArray<string>,
  ): ReadonlySet<string> {
    const cacheKey = `${policyId}|v=${policyVersion ?? 'none'}|count=${ids.length}`;

    const cached = this.exemptUserCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    if (this.exemptUserCache.size >= BypassChecker.MAX_CACHE_ENTRIES) {
      const oldest = this.exemptUserCache.keys().next().value;

      if (oldest !== undefined) {
        this.exemptUserCache.delete(oldest);
      }
    }

    const set = new Set(ids);

    this.exemptUserCache.set(cacheKey, set);

    return set;
  }

  async check(
    bypass: RateLimitBypassPolicy,
    request: RateLimitRequest,
    tokenVerifier?: IBypassTokenVerifier,
    policyId?: string,
    policyVersion?: number,
    ruleScope?: RateLimitRule['match']['scope'],
  ): Promise<BypassMatch | null> {
    if (bypass.exemptUserIds && request.userId) {
      const exemptSet = this.getExemptUserSet(policyId ?? '', policyVersion, bypass.exemptUserIds);
      if (exemptSet.has(request.userId)) {
        return { reason: 'exempt-user' };
      }
    }

    if (bypass.exemptCidrs && bypass.exemptCidrs.length > 0) {
      for (const cidr of bypass.exemptCidrs) {
        try {
          if (isInCidr(request.ip, cidr)) {
            return { reason: 'exempt-cidr' };
          }
        } catch {
          // CIDR matching implementation unavailable.
          // Ignore CIDR bypass evaluation rather than
          // failing the entire rate-limit request.
        }
      }
    }

    if (bypass.bypassTokensEnabled && tokenVerifier) {
      const token = request.meta?.[BYPASS_TOKEN_META_KEY] ?? null;
      if (token) {
        const result = await tokenVerifier.verify(token);
        if (result.ok && (ruleScope === undefined || result.payload.scopes.includes(ruleScope))) {
          return { reason: 'bypass-token' };
        }
      }
    }

    return null;
  }
}

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

interface ExemptUserCacheEntry {
  readonly policyId: string;
  readonly policyVersion: number | undefined;
  readonly set: ReadonlySet<string>;
}

export class BypassChecker {
  private exemptUserCache: ExemptUserCacheEntry | null = null;

  private getExemptUserSet(
    policyId: string,
    policyVersion: number | undefined,
    ids: ReadonlyArray<string>,
  ): ReadonlySet<string> {
    if (
      this.exemptUserCache &&
      this.exemptUserCache.policyId === policyId &&
      this.exemptUserCache.policyVersion === policyVersion
    ) {
      return this.exemptUserCache.set;
    }
    const set = new Set(ids);
    this.exemptUserCache = { policyId, policyVersion, set };
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
        if (isInCidr(request.ip, cidr)) {
          return { reason: 'exempt-cidr' };
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

// Keep the free function as a thin wrapper for callers that don't need caching.
// New callers in multi-tenant contexts should instantiate BypassChecker directly.
export async function checkBypass(
  bypass: RateLimitBypassPolicy,
  request: RateLimitRequest,
  tokenVerifier?: IBypassTokenVerifier,
  policyId?: string,
  policyVersion?: number,
  ruleScope?: RateLimitRule['match']['scope'],
): Promise<BypassMatch | null> {
  return new BypassChecker().check(bypass, request, tokenVerifier, policyId, policyVersion, ruleScope);
}

export async function checkBypass(
  bypass: RateLimitBypassPolicy,
  request: RateLimitRequest,
  tokenVerifier?: IBypassTokenVerifier,
  policyId?: string,
  policyVersion?: number,
  ruleScope?: RateLimitRule['match']['scope'],
): Promise<BypassMatch | null> {
  // Exempt users take precedence.
  if (bypass.exemptUserIds && request.userId) {
    const exemptSet = getExemptUserSet(policyId ?? '', policyVersion, bypass.exemptUserIds);
    if (exemptSet.has(request.userId)) {
      return { reason: 'exempt-user' };
    }
  }

  // Exempt CIDRs.
  if (bypass.exemptCidrs && bypass.exemptCidrs.length > 0) {
    for (const cidr of bypass.exemptCidrs) {
      if (isInCidr(request.ip, cidr)) {
        return { reason: 'exempt-cidr' };
      }
    }
  }

  // Bypass tokens — only attempted when the policy opts in.
  if (bypass.bypassTokensEnabled && tokenVerifier) {
    const token = request.meta?.[BYPASS_TOKEN_META_KEY] ?? null;
    if (token) {
      const result = await tokenVerifier.verify(token);
      if (result.ok) {
        if (result.ok && (ruleScope === undefined || result.payload.scopes.includes(ruleScope))) {
          return { reason: 'bypass-token' };
        }
      }
    }
  }
  return null;
}

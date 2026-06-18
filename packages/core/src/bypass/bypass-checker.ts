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

export interface BypassCheckDiagnostics {
  onCidrEvaluationError?(cidr: string, error: unknown): void;
}

export class BypassChecker {
  private readonly exemptUserSetByPolicy = new WeakMap<RateLimitBypassPolicy, ReadonlySet<string>>();
  constructor(private readonly diagnostics: BypassCheckDiagnostics = {}) {}

  private getExemptUserSet(bypass: RateLimitBypassPolicy): ReadonlySet<string> {
    const cached = this.exemptUserSetByPolicy.get(bypass);

    if (cached) {
      return cached;
    }

    const set = new Set(bypass.exemptUserIds ?? []);

    this.exemptUserSetByPolicy.set(bypass, set);

    return set;
  }

  async check(
    bypass: RateLimitBypassPolicy,
    request: RateLimitRequest,
    tokenVerifier?: IBypassTokenVerifier,
    ruleScope?: RateLimitRule['match']['scope'],
  ): Promise<BypassMatch | null> {
    if (bypass.exemptUserIds && request.userId) {
      const exemptSet = this.getExemptUserSet(bypass);
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
        } catch (error) {
          this.diagnostics.onCidrEvaluationError?.(cidr, error);
          // Malformed CIDR should have been rejected by PolicyValidator,
          // but defend in depth: skip this entry rather than failing
          // the whole request, while still surfacing the failure.
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

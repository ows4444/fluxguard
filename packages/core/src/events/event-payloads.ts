import type { RateLimitDiagnostics, RateLimitEvaluation } from '@fluxguard/contracts';
import { DEFAULT_REQUEST_COST, type RateLimitRequest } from '@fluxguard/contracts';

import { createEventSubject } from './event-subject';
export function createBaseEvaluationPayload(
  request: RateLimitRequest,
  diagnostics: RateLimitDiagnostics,
  evaluation: RateLimitEvaluation,
) {
  return {
    ip: request.ip,
    method: request.method,
    route: request.route,
    cost: request.cost ?? DEFAULT_REQUEST_COST,
    evaluationDurationUs: diagnostics.totalEvaluationDurationUs,

    ...(diagnostics.algorithmDurationUs !== undefined ? { algorithmDurationUs: diagnostics.algorithmDurationUs } : {}),

    ...(diagnostics.usedReplicaRead !== undefined ? { usedReplicaRead: diagnostics.usedReplicaRead } : {}),

    ...(diagnostics.fromIdempotencyCache !== undefined
      ? { fromIdempotencyCache: diagnostics.fromIdempotencyCache }
      : {}),
    evaluation,

    ...createEventSubject(request),
  };
}

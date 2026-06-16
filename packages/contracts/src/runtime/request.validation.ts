import { parseIpAddress } from '../primitives/network';
import { parseRouteTemplate } from '../primitives/route';
import { DEFAULT_REQUEST_COST, type RateLimitRequest } from './runtime.contract';
import { validateRequestMetadata } from './runtime.validation';

export function validateRequest(request: RateLimitRequest): boolean {
  if (!parseRouteTemplate(request.route).ok) {
    return false;
  }

  if (!parseIpAddress(request.ip).ok) {
    return false;
  }

  const cost = request.cost ?? DEFAULT_REQUEST_COST;

  if (!Number.isFinite(cost)) {
    return false;
  }

  if (cost <= 0) {
    return false;
  }

  if (request.meta && !validateRequestMetadata(request.meta)) {
    return false;
  }

  return true;
}

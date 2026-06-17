import { parseIpAddress } from '../primitives/network';
import { parseRouteTemplate } from '../primitives/route';
import { DEFAULT_REQUEST_COST, type RateLimitRequest } from './runtime.contract';
import { validateRequestMetadata } from './runtime.validation';

export interface RequestValidationError {
  readonly field: string;
  readonly message: string;
}

export interface RequestValidationResult {
  readonly errors: ReadonlyArray<RequestValidationError>;
  readonly valid: boolean;
}

const VALID: RequestValidationResult = Object.freeze({ valid: true, errors: [] });

function fail(field: string, message: string): RequestValidationResult {
  return { valid: false, errors: [{ field, message }] };
}

export function validateRequest(request: RateLimitRequest): RequestValidationResult {
  const routeResult = parseRouteTemplate(request.route);
  if (!routeResult.ok) {
    return fail('route', routeResult.error);
  }

  if (!parseIpAddress(request.ip).ok) {
    return fail('ip', 'invalid IP address');
  }

  const cost = request.cost ?? DEFAULT_REQUEST_COST;
  if (!Number.isFinite(cost)) {
    return fail('cost', 'cost must be a finite number');
  }
  if (cost <= 0) {
    return fail('cost', 'cost must be greater than 0');
  }

  if (request.meta && !validateRequestMetadata(request.meta)) {
    return fail('meta', 'invalid request metadata');
  }

  return VALID;
}

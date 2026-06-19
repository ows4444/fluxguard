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
  const errors: RequestValidationError[] = [];
  const routeResult = parseRouteTemplate(request.route);
  if (!routeResult.ok) {
    errors.push({
      field: 'route',
      message: routeResult.error,
    });
  }

  if (!parseIpAddress(request.ip).ok) {
    errors.push({
      field: 'ip',
      message: 'invalid IP address',
    });
  }

  const cost = request.cost ?? DEFAULT_REQUEST_COST;
  if (!Number.isFinite(cost)) {
    errors.push({
      field: 'cost',
      message: 'cost must be a finite number',
    });
  }
  if (cost <= 0) {
    errors.push({
      field: 'cost',
      message: 'cost must be greater than 0',
    });
  }

  if (request.meta && !validateRequestMetadata(request.meta)) {
    errors.push({
      field: 'meta',
      message: 'invalid request metadata',
    });
  }

  return errors.length === 0
    ? VALID
    : {
        valid: false,
        errors,
      };
}

import { RateLimiterConfigurationError } from '../errors';
import { assertNever } from '../primitives';
import type {
  BurstConfig,
  CooldownRateLimitConfig,
  ProgressiveBlockingConfig,
  QuotaRateLimitConfig,
  RateLimitConfig,
} from './rate-limit.interfaces';
import {
  markValidated,
  QUOTA_ALGORITHM,
  type QuotaAlgorithm,
  RATE_LIMIT_KIND,
  type Validated,
} from './rate-limit.types';

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly issues: ReadonlyArray<ValidationIssue>;
  readonly valid: boolean;
}

export type NormalizedQuotaRateLimitConfig =
  | (Omit<QuotaRateLimitConfig, 'algorithm'> & {
      readonly algorithm: typeof QUOTA_ALGORITHM.FIXED;
    })
  | (Omit<QuotaRateLimitConfig, 'algorithm'> & {
      readonly algorithm: typeof QUOTA_ALGORITHM.GCRA;
    });

export type NormalizedCooldownRateLimitConfig = CooldownRateLimitConfig;

export type NormalizedRateLimitConfig = NormalizedQuotaRateLimitConfig | NormalizedCooldownRateLimitConfig;

export type ValidatedConfig = Validated<NormalizedRateLimitConfig>;

export type RateLimitConfigValidator = (config: RateLimitConfig) => ValidationResult;

const SUPPORTED_QUOTA_ALGORITHMS = new Set<QuotaAlgorithm>(Object.values(QUOTA_ALGORITHM));

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validatePositiveNumber(issues: ValidationIssue[], field: string, value: unknown): void {
  if (!isFiniteNumber(value) || value <= 0) {
    issues.push({
      field,
      message: `${field} must be a positive finite number`,
    });
  }
}

function validateNonNegativeNumber(issues: ValidationIssue[], field: string, value: unknown): void {
  if (!isFiniteNumber(value) || value < 0) {
    issues.push({
      field,
      message: `${field} must be a non-negative finite number`,
    });
  }
}

function validatePositiveInteger(issues: ValidationIssue[], field: string, value: unknown): void {
  if (!Number.isInteger(value) || !isFiniteNumber(value) || value <= 0) {
    issues.push({
      field,
      message: `${field} must be a positive integer`,
    });
  }
}

function validateBurstConfig(burst: BurstConfig, issues: ValidationIssue[]): void {
  validatePositiveInteger(issues, 'burst.burstPoints', burst.burstPoints);
}

function validateProgressiveBlockingConfig(config: ProgressiveBlockingConfig, issues: ValidationIssue[]): void {
  validatePositiveNumber(issues, 'progressiveBlocking.initialBlockSeconds', config.initialBlockSeconds);

  validatePositiveNumber(issues, 'progressiveBlocking.maxBlockSeconds', config.maxBlockSeconds);

  validatePositiveNumber(issues, 'progressiveBlocking.multiplier', config.multiplier);

  validatePositiveNumber(issues, 'progressiveBlocking.violationTtlSeconds', config.violationTtlSeconds);

  if (config.maxBlockSeconds < config.initialBlockSeconds) {
    issues.push({
      field: 'progressiveBlocking.maxBlockSeconds',
      message: 'progressiveBlocking.maxBlockSeconds must be greater than or equal to initialBlockSeconds',
    });
  }
}

export function validateRateLimitConfig(config: RateLimitConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  validatePositiveNumber(issues, 'duration', config.duration);

  if (config.executionTimeoutMs !== undefined) {
    validateNonNegativeNumber(issues, 'executionTimeoutMs', config.executionTimeoutMs);
  }

  switch (config.kind) {
    case RATE_LIMIT_KIND.QUOTA: {
      validatePositiveInteger(issues, 'points', config.points);

      if (config.algorithm !== undefined && !SUPPORTED_QUOTA_ALGORITHMS.has(config.algorithm)) {
        issues.push({
          field: 'algorithm',
          message: `Unsupported quota algorithm: ${config.algorithm}`,
        });
      }

      if (config.blockDuration !== undefined) {
        validatePositiveNumber(issues, 'blockDuration', config.blockDuration);
      }

      if (config.blockMultiplier !== undefined) {
        validatePositiveNumber(issues, 'blockMultiplier', config.blockMultiplier);
      }

      if (config.burst) {
        validateBurstConfig(config.burst, issues);

        if (config.burst.burstPoints > config.points * 10) {
          issues.push({
            field: 'burst.burstPoints',
            message: 'burstPoints exceeds maximum supported amplification',
          });
        }
      }

      if (config.progressiveBlocking) {
        validateProgressiveBlockingConfig(config.progressiveBlocking, issues);
      }

      break;
    }

    case RATE_LIMIT_KIND.COOLDOWN:
      break;

    default:
      assertNever(config);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function normalizeRateLimitConfig(config: RateLimitConfig): NormalizedRateLimitConfig {
  if (config.kind !== RATE_LIMIT_KIND.QUOTA) {
    return config;
  }

  const algorithm = config.algorithm ?? QUOTA_ALGORITHM.FIXED;

  switch (algorithm) {
    case QUOTA_ALGORITHM.FIXED:
      return {
        ...config,
        algorithm: QUOTA_ALGORITHM.FIXED,
      };

    case QUOTA_ALGORITHM.GCRA:
      return {
        ...config,
        algorithm: QUOTA_ALGORITHM.GCRA,
      };

    default:
      return assertNever(algorithm);
  }
}

export function assertValidRateLimitConfig(config: RateLimitConfig): ValidatedConfig {
  const normalizedConfig = normalizeRateLimitConfig(config);

  const validation = validateRateLimitConfig(normalizedConfig);

  if (!validation.valid) {
    throw new RateLimiterConfigurationError(
      validation.issues.map((issue) => `${issue.field}: ${issue.message}`).join(', '),
    );
  }

  return markValidated(normalizedConfig);
}

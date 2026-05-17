import type { ExposureMetadata } from '@fluxguard/contracts';

export function createExposureMetadata(message?: string, errorCode?: string): ExposureMetadata {
  if (message === undefined && errorCode === undefined) {
    return {};
  }
  return {
    ...(message !== undefined ? { message } : {}),
    ...(errorCode !== undefined ? { errorCode } : {}),
  };
}

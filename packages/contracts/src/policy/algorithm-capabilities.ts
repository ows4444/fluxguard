import type { StoreConsumeMode } from '../store/store.command';
import type { RateLimitAlgorithmId } from './algorithm';
import type { RateLimitWindowPolicy } from './window.types';

export interface AlgorithmCapabilities {
  readonly storeMode: StoreConsumeMode;
  readonly supportedWindows: readonly RateLimitWindowPolicy['type'][];
  readonly supportsBurstLimit: boolean;
  readonly supportsRefillRate: boolean;
}

export const AlgorithmCapabilitiesRegistry: Readonly<Record<RateLimitAlgorithmId, AlgorithmCapabilities>> =
  Object.freeze({
    'fixed-window': {
      storeMode: 'counter',
      supportsBurstLimit: false,
      supportsRefillRate: false,
      supportedWindows: ['fixed-window'],
    },
    'sliding-window-log': {
      storeMode: 'counter',
      supportsBurstLimit: false,
      supportsRefillRate: false,
      supportedWindows: ['fixed-window'],
    },
    'sliding-window-counter': {
      storeMode: 'counter',
      supportsBurstLimit: false,
      supportsRefillRate: false,
      supportedWindows: ['fixed-window'],
    },
    'token-bucket': {
      storeMode: 'token-bucket',
      supportsBurstLimit: true,
      supportsRefillRate: true,
      supportedWindows: ['fixed-window'],
    },
    'leaky-bucket': {
      storeMode: 'token-bucket',
      supportsBurstLimit: true,
      supportsRefillRate: true,
      supportedWindows: ['fixed-window'],
    },
    gcra: {
      storeMode: 'token-bucket',
      supportsBurstLimit: true,
      supportsRefillRate: true,
      supportedWindows: ['fixed-window'],
    },
  });

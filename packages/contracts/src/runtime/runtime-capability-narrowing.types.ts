import type { RuntimeCapabilities } from './runtime-capabilities.types';
import type { RuntimeStore } from './runtime-store.types';

export type RuntimeStoreWithCapability<T extends keyof RuntimeCapabilities> = RuntimeStore & {
  capabilities: RuntimeCapabilities & {
    readonly [K in T]: true;
  };
};

import type { AdjustableRuntimeStore, RuntimeStore } from './runtime-store.types';

export function isAdjustableRuntimeStore(store: RuntimeStore): store is AdjustableRuntimeStore {
  return store.capabilities.adjustments && 'adjust' in store;
}

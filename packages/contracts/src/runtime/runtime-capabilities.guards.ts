import type { RuntimeStoreWithCapability } from './runtime-capability-narrowing.types';
import type { RuntimeStore } from './runtime-store.types';

export function supportsConsistentPeek(store: RuntimeStore): store is RuntimeStoreWithCapability<'consistentPeek'> {
  return store.capabilities.consistentPeek;
}

export function supportsStrongConsistency(
  store: RuntimeStore,
): store is RuntimeStoreWithCapability<'strongConsistency'> {
  return store.capabilities.strongConsistency;
}

export function supportsAtomicConsumption(
  store: RuntimeStore,
): store is RuntimeStoreWithCapability<'singleProcessSerializedConsumption'> {
  return store.capabilities.singleProcessSerializedConsumption;
}

import type { RuntimeCapableStore, RuntimeStore, RuntimeStoreCapabilities } from '../contracts';

export class RuntimeCapabilityResolver {
  resolve(store: RuntimeStore): RuntimeStoreCapabilities {
    if ('capabilities' in store && typeof store.capabilities === 'function') {
      return (store as RuntimeCapableStore).capabilities();
    }

    return {
      atomicFixedWindow: 'consumeFixedWindow' in store,

      gcra: 'consumeGcra' in store,

      burst: 'consumeBurst' in store,

      progressiveBlocking: 'consumeWithProgressiveBlocking' in store,

      adjustments: 'adjustFixedWindowIdempotent' in store && 'adjustBurstIdempotent' in store,

      peek: 'peekFixedWindow' in store,

      distributedTime: 'now' in store,
    };
  }
}

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

      adjustments: {
        fixedWindow: 'adjustFixedWindowIdempotent' in store,

        burst: 'adjustBurstIdempotent' in store,
      },

      peek: {
        fixedWindow: 'peekFixedWindow' in store,

        burst: 'peekBurst' in store,

        gcra: 'peekGcra' in store,
      },

      distributedTime: 'now' in store,
    };
  }
}

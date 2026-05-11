export interface RedisScriptContract {
  readonly keys: number;

  readonly args: number;
}

export const SCRIPT_CONTRACTS: Record<string, RedisScriptContract> = Object.freeze({
  'fixed-window-consume': { keys: 3, args: 6 },

  'fixed-window-get': { keys: 1, args: 1 },

  'fixed-window-adjust-idempotent': { keys: 2, args: 2 },

  'gcra-consume': { keys: 1, args: 2 },
  'gcra-peek': { keys: 1, args: 2 },

  'burst-consume': { keys: 2, args: 4 },

  'burst-get': { keys: 2, args: 2 },

  'burst-adjust-idempotent': { keys: 3, args: 2 },

  cooldown: { keys: 1, args: 1 },

  'cooldown-get': { keys: 1, args: 0 },
});

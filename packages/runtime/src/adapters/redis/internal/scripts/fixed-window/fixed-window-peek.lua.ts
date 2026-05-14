import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const fixedWindowPeekScript: LuaScriptDefinition<[number, number, number]> = {
  name: 'fixed-window-peek',

  script: `
local key = KEYS[1]

local limit = tonumber(ARGV[1])

local current =
  tonumber(
    redis.call('GET', key)
    or '0'
  )

local ttl =
  tonumber(
    redis.call('PTTL', key)
    or '0'
  )

local remaining =
  math.max(0, limit - current)

return {
  remaining,
  math.max(0, ttl),
  current
}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [number, number, number];
  },
};

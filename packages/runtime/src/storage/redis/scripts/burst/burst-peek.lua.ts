import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const burstPeekScript: LuaScriptDefinition<[number, number]> = {
  name: 'burst-peek',

  script: `
local sustainedCurrent =
  tonumber(
    redis.call('GET', KEYS[1]) or '0'
  )

local sustainedTtl =
  tonumber(
    redis.call('PTTL', KEYS[1]) or '0'
  )

local burstCurrent =
  tonumber(
    redis.call('GET', KEYS[2]) or '0'
  )

local burstTtl =
  tonumber(
    redis.call('PTTL', KEYS[2]) or '0'
  )

local sustainedLimit =
  tonumber(ARGV[1])

local burstLimit =
  tonumber(ARGV[2])

local sustainedRemaining =
  sustainedLimit - sustainedCurrent

local burstRemaining =
  burstLimit - burstCurrent

local remaining =
  math.min(
    sustainedRemaining,
    burstRemaining
  )

if remaining < 0 then
    remaining = 0
end

local retryAfter = 0

if sustainedRemaining <= 0 then
    retryAfter =
      math.max(
        retryAfter,
        sustainedTtl
      )
end

if burstRemaining <= 0 then
    retryAfter =
      math.max(
        retryAfter,
        burstTtl
      )
end

return {remaining, retryAfter}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [number, number];
  },
};

import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const burstConsumeScript: LuaScriptDefinition<[number, number, number, number, number]> = {
  name: 'burst-consume',

  script: `
local sustainedKey = KEYS[1]
local burstKey = KEYS[2]

local sustainedLimit = tonumber(ARGV[1])
local sustainedDuration = tonumber(ARGV[2])

local burstLimit = tonumber(ARGV[3])
local burstDuration = tonumber(ARGV[4])

local sustainedCurrent =
  tonumber(
    redis.call('GET', sustainedKey) or '0'
  )

local burstCurrent =
  tonumber(
    redis.call('GET', burstKey) or '0'
  )

if sustainedCurrent >= sustainedLimit then
    local ttl =
      tonumber(
        redis.call('PTTL', sustainedKey)
        or '0'
      )

    return {
      0,
      0,
      ttl,
      sustainedCurrent,
      burstCurrent
    }
end

if burstCurrent >= burstLimit then
    local ttl =
      tonumber(
        redis.call('PTTL', burstKey)
        or '0'
      )

    return {
      0,
      0,
      ttl,
      sustainedCurrent,
      burstCurrent
    }
end

sustainedCurrent =
  redis.call('INCR', sustainedKey)

burstCurrent =
  redis.call('INCR', burstKey)

if sustainedCurrent == 1 then
    redis.call(
      'PEXPIRE',
      sustainedKey,
      sustainedDuration
    )
end

if burstCurrent == 1 then
    redis.call(
      'PEXPIRE',
      burstKey,
      burstDuration
    )
end

local remaining =
  math.min(
    sustainedLimit - sustainedCurrent,
    burstLimit - burstCurrent
  )

return {
  1,
  remaining,
  0,
  sustainedCurrent,
  burstCurrent
}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [
      number,
      number,
      number,
      number,
      number,
    ];
  },
};

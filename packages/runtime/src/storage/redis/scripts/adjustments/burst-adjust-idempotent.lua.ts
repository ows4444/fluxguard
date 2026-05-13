import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const burstAdjustIdempotentScript: LuaScriptDefinition<[number, string | number, number?]> = {
  name: 'burst-adjust-idempotent',

  script: `
local sustainedKey = KEYS[1]
local burstKey = KEYS[2]
local operationKey = KEYS[3]

local delta = tonumber(ARGV[1])
local operationTtl = tonumber(ARGV[2])

if not delta or delta == 0 then
    return redis.error_reply(
      'invalid adjustment delta'
    )
end

local acquired =
  redis.call(
    'SET',
    operationKey,
    '1',
    'NX',
    'EX',
    operationTtl
  )

if not acquired then
    return {0, 'duplicate'}
end

local sustainedCurrent =
  tonumber(
    redis.call('GET', sustainedKey)
    or '0'
  )

local burstCurrent =
  tonumber(
    redis.call('GET', burstKey)
    or '0'
  )

local sustainedTtl =
  tonumber(
    redis.call('PTTL', sustainedKey)
    or '0'
  )

local burstTtl =
  tonumber(
    redis.call('PTTL', burstKey)
    or '0'
  )

if sustainedTtl <= 0
and burstTtl <= 0 then
    return {0, 'expired'}
end

local updatedSustained =
  sustainedCurrent + delta

local updatedBurst =
  burstCurrent + delta

if updatedSustained <= 0 then
    redis.call('DEL', sustainedKey)

    updatedSustained = 0
else
    redis.call(
      'SET',
      sustainedKey,
      updatedSustained,
      'PX',
      sustainedTtl
    )
end

if updatedBurst <= 0 then
    redis.call('DEL', burstKey)

    updatedBurst = 0
else
    redis.call(
      'SET',
      burstKey,
      updatedBurst,
      'PX',
      burstTtl
    )
end

return {
  1,
  updatedSustained,
  updatedBurst
}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [
      number,
      string | number,
      number?,
    ];
  },
};

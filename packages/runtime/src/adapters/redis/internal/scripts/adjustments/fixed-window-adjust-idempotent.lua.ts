import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const fixedWindowAdjustIdempotentScript: LuaScriptDefinition<[number, string | number]> = {
  name: 'fixed-window-adjust-idempotent',

  script: `
local limiterKey = KEYS[1]
local operationKey = KEYS[2]

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

local current =
  tonumber(
    redis.call('GET', limiterKey)
    or '0'
  )

local ttl =
  tonumber(
    redis.call('PTTL', limiterKey)
    or '0'
  )

if ttl <= 0 then
    return {0, 'expired'}
end

local updated = current + delta

if updated <= 0 then
    redis.call('DEL', limiterKey)

    return {1, 0}
end

redis.call(
  'SET',
  limiterKey,
  updated,
  'PX',
  ttl
)

return {1, updated}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [number, string | number];
  },
};

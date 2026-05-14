import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const fixedWindowProgressiveBlockingScript: LuaScriptDefinition<[number, number, number, number]> = {
  name: 'fixed-window-progressive-blocking',

  script: `
local key = KEYS[1]
local blockKey = KEYS[2]
local violationKey = KEYS[3]

local limit = tonumber(ARGV[1])
local durationMs = tonumber(ARGV[2])

local initialBlockSeconds = tonumber(ARGV[3])
local multiplier = tonumber(ARGV[4])
local maxBlockSeconds = tonumber(ARGV[5])
local violationTtlSeconds = tonumber(ARGV[6])

local blockTtl = tonumber(redis.call('PTTL', blockKey) or '-1')

if blockTtl > 0 then
    return {0, 0, blockTtl, 1}
end

local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
    local violations = redis.call('INCR', violationKey)

    if violations == 1 then
        redis.call(
          'EXPIRE',
          violationKey,
          violationTtlSeconds
        )
    end

    local duration =
      math.floor(
        initialBlockSeconds *
        math.pow(multiplier, violations - 1)
      )

    duration = math.min(duration, maxBlockSeconds)

    redis.call(
      'SET',
      blockKey,
      '1',
      'EX',
      duration
    )

    return {
      0,
      0,
      duration * 1000,
      1
    }
end

current = redis.call('INCR', key)

if current == 1 then
    redis.call('PEXPIRE', key, durationMs)
end

local remaining =
  math.max(0, limit - current)

return {1, remaining, 0, 0}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [
      number,
      number,
      number,
      number,
    ];
  },
};

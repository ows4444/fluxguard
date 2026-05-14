import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const fixedWindowBlockingConsumeScript: LuaScriptDefinition<[number, number, number, number]> = {
  name: 'fixed-window-blocking-consume',

  script: `
local key = KEYS[1]
local blockKey = KEYS[2]

local limit = tonumber(ARGV[1])
local duration = tonumber(ARGV[2])

local blocked = tonumber(redis.call('PTTL', blockKey) or '-1')

if blocked > 0 then
    return {0, 0, blocked, 1}
end

local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
    local ttl = tonumber(redis.call('PTTL', key) or '0')

    return {0, 0, ttl, 0}
end

current = redis.call('INCR', key)

if current == 1 then
    redis.call('PEXPIRE', key, duration)
end

local remaining = math.max(0, limit - current)

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

import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const gcraPeekScript: LuaScriptDefinition<[number, number, number]> = {
  name: 'gcra-peek',

  script: `
local key = KEYS[1]

local emission =
  tonumber(ARGV[1])

local burst =
  tonumber(ARGV[2])

local time = redis.call('TIME')

local now =
  (tonumber(time[1]) * 1000) +
  math.floor(tonumber(time[2]) / 1000)

local tat =
  tonumber(
    redis.call('GET', key)
    or '0'
  )

local allowedAt =
  tat - ((burst - 1) * emission)

if now < allowedAt then
    return {
      0,
      allowedAt - now,
      0
    }
end

local effectiveTat =
  math.max(now, tat)

local virtualStart =
  effectiveTat - (burst * emission)

local distance =
  now - virtualStart

local remaining =
  math.floor(distance / emission)

remaining =
  math.max(
    0,
    math.min(burst - 1, remaining)
  )

return {
  1,
  0,
  remaining
}
`,
  async execute(redis, keys, args) {
    return (await redis.eval(this.script, keys.length, ...keys, ...args.map(String))) as [number, number, number];
  },
};

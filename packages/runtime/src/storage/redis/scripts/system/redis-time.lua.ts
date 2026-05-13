import type { LuaScriptDefinition } from '../contracts/lua-script.interface';

export const redisTimeScript: LuaScriptDefinition<number> = {
  name: 'redis-time',

  script: `
local time = redis.call('TIME')

return (
  (tonumber(time[1]) * 1000) +
  math.floor(tonumber(time[2]) / 1000)
)
`,
  async execute(redis) {
    return (await redis.eval(this.script, 0)) as number;
  },
};

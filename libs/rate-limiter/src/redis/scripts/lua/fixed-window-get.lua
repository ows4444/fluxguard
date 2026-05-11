-- KEYS[1] = limiter key
--
-- ARGV[1] = limit
local key = KEYS[1]

local limit = tonumber(ARGV[1])

local current = tonumber(redis.call('GET', key) or '0')

local ttl = redis.call('PTTL', key)

if ttl < 0 then
    ttl = 0
end

local remaining = math.max(0, limit - current)

return {remaining, ttl, current}

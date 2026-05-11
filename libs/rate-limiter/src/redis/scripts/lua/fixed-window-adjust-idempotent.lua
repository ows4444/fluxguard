-- KEYS[1] = limiter key
-- KEYS[2] = operation key
--
-- ARGV[1] = delta
-- ARGV[2] = operation ttl seconds
local limiterKey = KEYS[1]
local operationKey = KEYS[2]

local delta = tonumber(ARGV[1])
local operationTtl = tonumber(ARGV[2])

if not delta or delta == 0 then
    return redis.error_reply('invalid adjustment delta')
end

local acquired = redis.call('SET', operationKey, '1', 'NX', 'EX', operationTtl)

if not acquired then
    return {0, 'duplicate'}
end

local current = tonumber(redis.call('GET', limiterKey) or '0')

local ttl = tonumber(redis.call('PTTL', limiterKey) or '0')

if ttl <= 0 and current > 0 then
    redis.call('DEL', limiterKey)

    current = 0
end

if ttl <= 0 then
    return {0, 'expired'}
end

local updated = current + delta

if updated <= 0 then
    redis.call('DEL', limiterKey)

    return {1, 0}
end

redis.call('SET', limiterKey, updated, 'PX', ttl)

return {1, updated}

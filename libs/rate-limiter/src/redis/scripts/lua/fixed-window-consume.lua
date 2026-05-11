-- KEYS[1] = limiter key
-- KEYS[2] = block key
-- KEYS[3] = violation key
--
-- ARGV[1] = limit
-- ARGV[2] = duration ms
-- ARGV[3] = progressive block seconds
-- ARGV[4] = multiplier
-- ARGV[5] = max progressive block seconds
-- ARGV[6] = violation ttl seconds
local key = KEYS[1]

local blockKey = KEYS[2]
local violationKey = KEYS[3]

local limit = tonumber(ARGV[1])
local duration = tonumber(ARGV[2])

local progressiveBlockSeconds = tonumber(ARGV[3])
local multiplier = tonumber(ARGV[4])
local maxProgressiveBlock = tonumber(ARGV[5])
local violationTtl = tonumber(ARGV[6])

local time = redis.call('TIME')

local nowMs = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

local blockedUntil = tonumber(redis.call('GET', blockKey) or '0')

if blockedUntil > nowMs then
    return {0, 0, blockedUntil - nowMs, 1}
end

local current = tonumber(redis.call('GET', key) or '0')

if current > 0 then
    local ttl = tonumber(redis.call('PTTL', key) or '0')

    if ttl <= 0 then
        redis.call('DEL', key)

        current = 0
    end
end

if current >= limit then
    local ttl = tonumber(redis.call('PTTL', key) or '0')

    if progressiveBlockSeconds > 0 then

        local violations = redis.call('INCR', violationKey)

        if violations == 1 then
            redis.call('EXPIRE', violationKey, violationTtl)
        end

        local blockSeconds = math.floor(progressiveBlockSeconds * math.pow(multiplier, math.max(0, violations - 1)))

        blockSeconds = math.min(blockSeconds, maxProgressiveBlock)

        local nextBlockedUntil = nowMs + (blockSeconds * 1000)

        redis.call('SET', blockKey, nextBlockedUntil, 'EX', blockSeconds)

        ttl = math.max(ttl, blockSeconds * 1000)
    end

    return {0, 0, ttl, 1}
end

current = redis.call('INCR', key)

if current == 1 then
    redis.call('PEXPIRE', key, duration)
end

local remaining = math.max(0, limit - current)

return {1, remaining, 0, 0}

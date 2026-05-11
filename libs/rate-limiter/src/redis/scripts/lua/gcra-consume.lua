-- KEYS[1] = limiter key
--
-- ARGV[1] = emission interval ms
-- ARGV[2] = burst capacity
--
-- Returns:
-- {allowed, retry_after_ms, remaining}
local key = KEYS[1]

local emission = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])

if not emission or emission <= 0 then
    return redis.error_reply('invalid emission interval')
end

if not burst or burst <= 0 then
    return redis.error_reply('invalid burst capacity')
end

local time = redis.call('TIME')

local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

local tat = tonumber(redis.call('GET', key) or '0')

local allowedAt = tat - ((burst - 1) * emission)

if now < allowedAt then
    local retryAfter = allowedAt - now

    return {0, retryAfter, 0}
end

local newTat = math.max(now, tat) + emission

local ttl = math.max(emission, math.ceil((newTat - now) + emission))

redis.call('SET', key, newTat, 'PX', ttl)

local virtualStart = newTat - (burst * emission)

local distance = now - virtualStart

local remaining = math.floor(distance / emission)

remaining = math.max(0, math.min(burst - 1, remaining))

return {1, 0, remaining}

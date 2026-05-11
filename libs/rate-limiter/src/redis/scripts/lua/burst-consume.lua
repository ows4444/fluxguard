-- KEYS[1] = sustained key
-- KEYS[2] = burst key
-- ARGV[1] = sustained limit
-- ARGV[2] = sustained duration ms
-- ARGV[3] = burst limit
-- ARGV[4] = burst duration ms
local sustainedKey = KEYS[1]
local burstKey = KEYS[2]

local sustainedLimit = tonumber(ARGV[1])
local sustainedDuration = tonumber(ARGV[2])

local burstLimit = tonumber(ARGV[3])
local burstDuration = tonumber(ARGV[4])

local sustainedCurrent = tonumber(redis.call('GET', sustainedKey) or '0')
local burstCurrent = tonumber(redis.call('GET', burstKey) or '0')

if sustainedCurrent > 0 then
    local ttl = tonumber(redis.call('PTTL', sustainedKey) or '0')

    if ttl <= 0 then
        redis.call('DEL', sustainedKey)

        sustainedCurrent = 0
    end
end

if burstCurrent > 0 then
    local ttl = tonumber(redis.call('PTTL', burstKey) or '0')

    if ttl <= 0 then
        redis.call('DEL', burstKey)

        burstCurrent = 0
    end
end

if sustainedCurrent >= sustainedLimit then
    local ttl = redis.call('PTTL', sustainedKey)

    return {0, 0, ttl, sustainedCurrent, burstCurrent}
end

if burstCurrent >= burstLimit then
    local ttl = redis.call('PTTL', burstKey)

    return {0, 0, ttl, sustainedCurrent, burstCurrent}
end

sustainedCurrent = redis.call('INCR', sustainedKey)
burstCurrent = redis.call('INCR', burstKey)

if sustainedCurrent == 1 then
    redis.call('PEXPIRE', sustainedKey, sustainedDuration)
end

if burstCurrent == 1 then
    redis.call('PEXPIRE', burstKey, burstDuration)
end

local remaining = math.min(sustainedLimit - sustainedCurrent, burstLimit - burstCurrent)

return {1, remaining, 0, sustainedCurrent, burstCurrent}

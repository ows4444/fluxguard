-- KEYS[1] = sustained key
-- KEYS[2] = burst key
-- KEYS[3] = operation key
--
-- ARGV[1] = delta
-- ARGV[2] = operation ttl seconds
local sustainedKey = KEYS[1]
local burstKey = KEYS[2]
local operationKey = KEYS[3]

local delta = tonumber(ARGV[1])
local operationTtl = tonumber(ARGV[2])

if not delta or delta == 0 then
    return redis.error_reply('invalid adjustment delta')
end

local acquired = redis.call('SET', operationKey, '1', 'NX', 'EX', operationTtl)

if not acquired then
    return {0, 'duplicate'}
end

local sustainedCurrent = tonumber(redis.call('GET', sustainedKey) or '0')
local burstCurrent = tonumber(redis.call('GET', burstKey) or '0')

local sustainedTtl = tonumber(redis.call('PTTL', sustainedKey) or '0')
local burstTtl = tonumber(redis.call('PTTL', burstKey) or '0')

if sustainedTtl <= 0 and sustainedCurrent > 0 then
    redis.call('DEL', sustainedKey)

    sustainedCurrent = 0
end

if burstTtl <= 0 and burstCurrent > 0 then
    redis.call('DEL', burstKey)

    burstCurrent = 0
end

if sustainedTtl <= 0 and burstTtl <= 0 then
    return {0, 'expired'}
end

local updatedSustained = sustainedCurrent + delta
local updatedBurst = burstCurrent + delta

if updatedSustained <= 0 then
    redis.call('DEL', sustainedKey)
    updatedSustained = 0
else

    if sustainedTtl > 0 then
        redis.call('SET', sustainedKey, updatedSustained, 'PX', sustainedTtl)
    end

end

if updatedBurst <= 0 then
    redis.call('DEL', burstKey)
    updatedBurst = 0
else

    if burstTtl > 0 then
        redis.call('SET', burstKey, updatedBurst, 'PX', burstTtl)
    end

end

return {1, updatedSustained, updatedBurst}

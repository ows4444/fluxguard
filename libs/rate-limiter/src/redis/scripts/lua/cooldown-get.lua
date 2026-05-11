-- KEYS[1] = cooldown key
local ttl = redis.call('PTTL', KEYS[1])

if ttl <= 0 then
    return {1, 0}
end

return {0, ttl}

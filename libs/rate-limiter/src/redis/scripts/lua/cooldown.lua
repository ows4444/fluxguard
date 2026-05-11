local ok = redis.call('SET', KEYS[1], '1', 'PX', ARGV[1], 'NX')

if ok then
    return 0
end

local ttl = redis.call('PTTL', KEYS[1])

if ttl < 0 then
    return tonumber(ARGV[1])
end

return ttl

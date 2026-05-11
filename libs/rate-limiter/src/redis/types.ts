import type { Cluster, Redis } from 'ioredis';

export type RedisClient = Redis | Cluster;

import Redis from "ioredis";

function createRedis(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });
}

export const redis: Redis = createRedis();

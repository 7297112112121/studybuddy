import Redis from "ioredis";

export function createRedis(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // 无 Redis 服务的上下文(build/docker/单测)import 时不连接不抛错,
    // 首次命令时自动连接,生产行为不变
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });
}

export const redis: Redis = createRedis();

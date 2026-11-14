import { beforeEach, describe, expect, it, vi } from "vitest";

// 模块级单例 + 动态 import 缓存:每个用例前重置模块注册表,保证拿到新单例
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("REDIS_URL", "redis://test:6379");
});

describe("redis 单例（src/lib/redis.ts）", () => {
  it("导出 ioredis 实例,lazyConnect 为 true,初始状态为 wait(未连接)", async () => {
    const { redis } = await import("@/lib/redis");
    const { default: Redis } = await import("ioredis");

    expect(redis).toBeInstanceOf(Redis);
    expect(redis.options.lazyConnect).toBe(true);
    expect(redis.status).toBe("wait");
  });
});

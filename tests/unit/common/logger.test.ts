/**
 * 服务端日志单例测试(src/common/logger.ts):级别取 LOG_LEVEL 环境变量,
 * 缺省落 "info"。模块作用域单例——resetModules + stubEnv 双态动态 import
 * (脚手架先例:better-auth.server.test.ts)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalLogLevel = process.env.LOG_LEVEL;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  // 还原真实环境,免污染同进程其他测试文件
  if (originalLogLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = originalLogLevel;
  }
});

describe("logger 级别取值", () => {
  it("LOG_LEVEL=debug → 级别为 debug", async () => {
    vi.stubEnv("LOG_LEVEL", "debug");

    const { logger } = await import("@/common/logger");

    expect(logger.level).toBe("debug");
  });

  it("LOG_LEVEL 缺省 → 级别为 info", async () => {
    delete process.env.LOG_LEVEL;

    const { logger } = await import("@/common/logger");

    expect(logger.level).toBe("info");
  });
});

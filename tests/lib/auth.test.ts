/**
 * src/lib/auth.ts 单元测试（Task 4，design「src/lib/auth.ts」契约）。
 *
 * 两类守护：
 * 1. 内联 PHONE_RE 副本与 validators 单一来源的逐字符同步（design：
 *    lib/auth.ts 不可从 validators 导入，副本一致性由本测试比对 source 守护）；
 * 2. betterAuth 实例可用性——无 .env 上下文（build/docker）模块作用域不抛错，
 *    注入测试 env 后动态 import，断言 handler 为可调用函数。
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PHONE_RE } from "@/modules/auth/validators";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
});

describe("auth 实例（src/lib/auth.ts）", () => {
  it("内联 PHONE_RE 副本与 validators.PHONE_RE 逐字符同步", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/auth.ts"),
      "utf8",
    );
    const match = source.match(/const PHONE_RE = \/(.+?)\/[a-z]*;/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(PHONE_RE.source);
  });

  it("注入 env 后 betterAuth 初始化成功,auth.handler 为可调用函数", async () => {
    const { auth } = await import("@/lib/auth");
    expect(typeof auth.handler).toBe("function");
  });
});

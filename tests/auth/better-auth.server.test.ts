/**
 * src/common/better-auth.server.ts 单元测试（Task 4，design「src/auth/better-auth.server.ts」契约）。
 *
 * 守护 betterAuth 实例可用性——无 .env 上下文（build/docker）模块作用域
 * 不抛错，注入测试 env 后动态 import，断言 handler 为可调用函数。
 * （原「内联 USERNAME_RE 副本与 validators 逐字符同步」守护随真源迁移
 * 裁决撤销：USERNAME_RE 真源已并入 validators.ts，全仓仅一份字面值，
 * 不再有跨文件副本可失同步。）
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "../../src/validation/auth";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
});

describe("auth 实例（src/common/better-auth.server.ts）", () => {
  it("注入 env 后 betterAuth 初始化成功,auth.handler 为可调用函数", async () => {
    const { auth } = await import("@/auth/better-auth.server");
    expect(typeof auth.handler).toBe("function");
  });
});

describe("服务端规则配置收敛", () => {
  it("密码与账户名长度界限引用 validators 常量，禁止复写字面值", async () => {
    const { auth } = await import("@/auth/better-auth.server");
    expect(auth.options.emailAndPassword.minPasswordLength).toBe(
      PASSWORD_MIN_LENGTH,
    );
    expect(auth.options.emailAndPassword.maxPasswordLength).toBe(
      PASSWORD_MAX_LENGTH,
    );
    const usernamePlugin = auth.options.plugins?.find(
      (plugin) => (plugin as { id?: string }).id === "username",
    );
    expect(usernamePlugin).toBeDefined();
    const usernameOptions = (
      usernamePlugin as {
        options?: { minUsernameLength?: number; maxUsernameLength?: number };
      }
    ).options;
    expect(usernameOptions?.minUsernameLength).toBe(USERNAME_MIN_LENGTH);
    expect(usernameOptions?.maxUsernameLength).toBe(USERNAME_MAX_LENGTH);
  });
});

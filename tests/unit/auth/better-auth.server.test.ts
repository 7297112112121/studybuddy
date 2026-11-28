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
} from "@/validation/auth";

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

describe("rateLimit 开关（E2E 限流门控）", () => {
  it("E2E_RATE_LIMIT=off → rateLimit.enabled 为 false", async () => {
    vi.stubEnv("E2E_RATE_LIMIT", "off");

    const { auth } = await import("@/auth/better-auth.server");

    expect(auth.options.rateLimit?.enabled).toBe(false);
  });

  it("E2E_RATE_LIMIT 非 off → enabled 保持 undefined（走 better-auth 默认）", async () => {
    vi.stubEnv("E2E_RATE_LIMIT", "");

    const { auth } = await import("@/auth/better-auth.server");

    expect(auth.options.rateLimit?.enabled).toBeUndefined();
  });
});

describe("禁用端点守卫（hooks.before）", () => {
  /** better-call createMiddleware 返回物即 handler 本体（.options 附挂），运行体只读 ctx.path。 */
  async function beforeHandler(): Promise<
    (ctx: { path: string }) => Promise<void>
  > {
    const { auth } = await import("@/auth/better-auth.server");
    const before = (
      auth.options.hooks as {
        before?: (ctx: { path: string }) => Promise<void>;
      }
    ).before;
    expect(before).toBeTypeOf("function");
    return before!;
  }

  it.each([["/sign-up/email"], ["/sign-in/email"], ["/is-username-available"]])(
    "%s → 拒约 FORBIDDEN（自写段已由 routes.ts 端点承载）",
    async (path) => {
      const handler = await beforeHandler();

      await expect(handler({ path })).rejects.toMatchObject({
        status: "FORBIDDEN",
      });
    },
  );

  it("非禁用路径（/get-session）→ 放行", async () => {
    const handler = await beforeHandler();

    await expect(handler({ path: "/get-session" })).resolves.toBeUndefined();
  });
});

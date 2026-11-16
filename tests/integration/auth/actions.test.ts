/**
 * registerAction 集成测试（Task 6 换装，design「modules/auth/actions.ts」契约）。
 *
 * 真实 Postgres（compose.dev.yaml），覆盖 design 契约总表 actions 行：
 * 1. 合法入参 → { ok: true } 且 user/account 行落库（经 service 事务，
 *    user.username = 入参账户名）；
 * 2. 非法账户名（'zhang san!'，含空格与非合法字符）→ INVALID_INPUT +
 *    fieldErrors.username（zod 复验，边界 #1 后端半边，不触达 service/db）；
 * 3. 同名重复注册 → USERNAME_ALREADY_REGISTERED（service 23505 映射透传）。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { uniqueUsername } from "../helpers";
import { registerAction } from "../../../src/modules/auth/actions";

const PASSWORD = "abcdefg1"; // 与 service.test.ts 一致（PASSWORD_RE：字母+数字，8..20）

afterAll(async () => {
  await db.$client.end();
});

describe("registerAction（tests/integration/auth/actions）", () => {
  it("合法入参 → { ok: true }，user/account 行落库（user.username=入参）", async () => {
    const username = uniqueUsername();

    const result = await registerAction({
      username,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(result).toEqual({ ok: true });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe(username);

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, users[0]!.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.providerId).toBe("credential");
  });

  it("账户名 'zhang san!' → INVALID_INPUT + fieldErrors.username，不落库", async () => {
    const result = await registerAction({
      username: "zhang san!",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(result).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { username: "auth.account.invalid" },
    });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, "zhang san!"));
    expect(users).toHaveLength(0);
  });

  it("同名重复注册 → USERNAME_ALREADY_REGISTERED", async () => {
    const username = uniqueUsername();
    const input = {
      username,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true as const,
    };

    const first = await registerAction(input);
    expect(first).toEqual({ ok: true });

    const second = await registerAction(input);
    expect(second).toEqual({ ok: false, error: "USERNAME_ALREADY_REGISTERED" });
  });
});

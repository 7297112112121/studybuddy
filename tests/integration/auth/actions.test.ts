/**
 * registerAction 集成测试（Task 7，design「modules/auth/actions.ts」契约）。
 *
 * 真实 Postgres（compose.dev.yaml），覆盖 design 契约总表 actions 行：
 * 1. 合法入参 → { ok: true } 且 user/account 行落库（经 service 事务）；
 * 2. 非法 phone（10 位）→ INVALID_INPUT + fieldErrors.phone
 *    （zod 复验，边界 #1 后端半边，不触达 service/db）；
 * 3. 同号重复注册 → PHONE_ALREADY_REGISTERED（service 23505 映射透传）。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { uniquePhone } from "../helpers";
import { registerAction } from "../../../src/modules/auth/actions";

const PASSWORD = "abcdefg1"; // 与 service.test.ts 一致（PASSWORD_RE：字母+数字，8..20）

afterAll(async () => {
  await db.$client.end();
});

describe("registerAction（tests/integration/auth/actions）", () => {
  it("合法入参 → { ok: true }，user/account 行落库", async () => {
    const phone = uniquePhone();

    const result = await registerAction({
      phone,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(result).toEqual({ ok: true });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.phoneNumber, phone));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe(phone);

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, users[0]!.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.providerId).toBe("credential");
  });

  it("phone 10 位 → INVALID_INPUT + fieldErrors.phone，不落库", async () => {
    const phone = uniquePhone();
    const badPhone = phone.slice(0, 10);

    const result = await registerAction({
      phone: badPhone,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(result).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { phone: "auth.register.phoneInvalid" },
    });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.phoneNumber, badPhone));
    expect(users).toHaveLength(0);
  });

  it("同号重复注册 → PHONE_ALREADY_REGISTERED", async () => {
    const phone = uniquePhone();
    const input = {
      phone,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true as const,
    };

    const first = await registerAction(input);
    expect(first).toEqual({ ok: true });

    const second = await registerAction(input);
    expect(second).toEqual({ ok: false, error: "PHONE_ALREADY_REGISTERED" });
  });
});

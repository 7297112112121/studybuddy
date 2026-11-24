/**
 * POST /api/auth/register 端点集成测试（数据流向评审裁决 5b，接替
 * actions.test.ts——registerAction 已废除，注册收编为统一接口自写端点）。
 *
 * 直接调用 route handler（Request → Response），真实 Postgres
 * （compose.dev.yaml），覆盖端点契约：
 * 1. 合法入参 → 200 { ok: true } 且 user/account 行落库（经 service 事务，
 *    user.username = 入参账户名）；
 * 2. 非法账户名（'zhang san!'，含空格与非合法字符）→ 400 INVALID_INPUT +
 *    fieldErrors.username（表单级复验，不触达 service/db）；
 * 3. 同名重复注册 → 409 USERNAME_ALREADY_REGISTERED（service 23505 映射透传）。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { uniqueUsername } from "../helpers";
import { POST } from "../../../src/app/api/auth/register/route";

const PASSWORD = "abcdefg1"; // 与 service.test.ts 一致（PASSWORD_RE：字母+数字，8..20）

/** 组装注册 POST 请求并直调 handler。 */
function postRegister(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

afterAll(async () => {
  await db.$client.end();
});

describe("POST /api/auth/register（tests/integration/auth/register）", () => {
  it("合法入参 → 200 { ok: true }，user/account 行落库（user.username=入参）", async () => {
    const username = uniqueUsername();

    const response = await postRegister({
      username,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

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

  it("账户名 'zhang san!' → 400 INVALID_INPUT + fieldErrors.username，不落库", async () => {
    const response = await postRegister({
      username: "zhang san!",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
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

  it("同名重复注册 → 409 USERNAME_ALREADY_REGISTERED", async () => {
    const username = uniqueUsername();
    const input = {
      username,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      agreementAccepted: true as const,
    };

    const first = await postRegister(input);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true });

    const second = await postRegister(input);
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({
      ok: false,
      error: "USERNAME_ALREADY_REGISTERED",
    });
  });
});

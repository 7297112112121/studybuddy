/**
 * POST /api/auth/register 端点接口测试（数据流向评审裁决 5b，接替
 * actions.test.ts——registerAction 已废除，注册收编为统一接口自写端点；
 * service 层直调用例已并入本文件，覆盖无差）。
 *
 * 直接调用 route handler（Request → Response），真实 Postgres
 * （compose.dev.yaml），覆盖端点契约 + 落库断言：
 * 1. 合法入参 → 200 { ok: true }，落库形状完整（user.name/占位邮箱/
 *    agreement 留痕；account credential 密码摘要不含明文，verifyPassword 反验，
 *    R9/R13/R15）；
 * 2. 非法账户名（'zhang san!'）→ 400 INVALID_INPUT + fieldErrors.username
 *    （表单级复验，不触达 service/db）；
 * 3. 同名重复注册 → 409 USERNAME_ALREADY_REGISTERED（service 23505 映射透传，
 *    user 表恰 1 行，R10）；
 * 4. 并发同名 → 恰一 200 一 409，库内恰 1 行（R14）；
 * 5. 并发大小写变体 → 两账号均 200，两行共存（区分大小写直证，F-01）。
 */
import { eq, inArray } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/common/db";
import { account, user } from "@/db/schema";
import { uniqueUsername } from "../../support/username";
import { POST } from "@/app/api/auth/register/route";
import { API_ROUTES } from "@/app/api/routes";

const PASSWORD = "abcdefg1"; // 合法测试密码（PASSWORD_RE：字母+数字，8..20）

/** 组装注册 POST 请求并直调 handler。 */
function postRegister(body: unknown): Promise<Response> {
  return POST(
    new Request(`http://localhost${API_ROUTES.authRegister}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** 合法注册载荷。 */
function validBody(username: string) {
  return {
    username,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    agreementAccepted: true,
  };
}

afterAll(async () => {
  await db.$client.end();
});

describe("POST /api/auth/register（tests/endpoint/auth/register）", () => {
  it("合法入参 → 200 { ok: true }，落库形状完整（摘要不含明文，R9/R13/R15）", async () => {
    const startedAt = new Date();
    const username = uniqueUsername();

    const response = await postRegister(validBody(username));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
    const u = users[0]!;
    expect(u.name).toBe(username);
    expect(u.username).toBe(username);
    // 占位邮箱字面模板——格式变更即有意变更，须同步本断言
    expect(u.email).toBe(`${username}@user.styb.invalid`);
    // R15：agreement 同意留痕
    expect(u.agreementVersion).toBe("v1");
    expect(u.agreedAt.getTime()).toBeGreaterThan(startedAt.getTime());

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, u.id));
    expect(accounts).toHaveLength(1);
    const acc = accounts[0]!;
    expect(acc.providerId).toBe("credential");
    expect(acc.accountId).toBe(u.id);
    // R13：只存「盐:哈希」摘要，不含明文
    expect(acc.password).toMatch(/^\S+:\S+$/);
    expect(acc.password).not.toContain(PASSWORD);
    expect(
      await verifyPassword({
        hash: acc.password as string,
        password: PASSWORD,
      }),
    ).toBe(true);
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

  it("同名重复注册 → 409 USERNAME_ALREADY_REGISTERED，user 表恰 1 行（R10）", async () => {
    const username = uniqueUsername();

    const first = await postRegister(validBody(username));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true });

    const second = await postRegister(validBody(username));
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({
      ok: false,
      error: "USERNAME_ALREADY_REGISTERED",
    });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
  });

  it("并发同名注册 → 恰一 200 一 409，库内恰 1 行（R14）", async () => {
    const username = uniqueUsername();

    const [a, b] = await Promise.all([
      postRegister(validBody(username)),
      postRegister(validBody(username)),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
  });

  it("并发大小写变体注册 → 两账号均 200，两行共存（区分大小写直证，F-01）", async () => {
    // uniqueUsername 全 [0-9a-z]，uppercase 后为逐字符大小写互变的合法变体对
    // （等价「Alice/alice」字面），跨运行唯一防残留串扰。
    const lower = uniqueUsername();
    const upper = lower.toUpperCase();

    const [a, b] = await Promise.all([
      postRegister(validBody(lower)),
      postRegister(validBody(upper)),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const users = await db
      .select()
      .from(user)
      .where(inArray(user.username, [lower, upper]));
    expect(users).toHaveLength(2);
  });
});

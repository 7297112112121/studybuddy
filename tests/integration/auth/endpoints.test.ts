/**
 * Better Auth 端点集成测试（Task 6，design「Review Focus #1/#2」）。
 *
 * 覆盖：
 * 1. R7 三情形同文案（Review Focus #1）：/sign-in/phone-number 对
 *    「未注册号 / 错密码 / 空密码直连 POST」返回同状态码 + 同 code + 同
 *    message，无账号存在性探测面（design 开放问题 #1 闭合点）；
 * 2. hook 403：邮箱注册/登录端点被 lib/auth.ts before hook 拦死（B2）；
 * 3. 登录成功双写（B5）：PG session 行 + Redis（secondaryStorage）会话键；
 * 4. 退出失效（R11 服务端半边）：sign-out 后旧 cookie get-session 无用户、
 *    Redis 会话键与 PG session 行均删。
 *
 * 各用例独立 uniquePhone()，防 phoneNumber 插件 10 次/60 秒限流串扰。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { session } from "@/db/schema";
import { redis } from "@/lib/redis";
import { directPost, signInAndGetCookie, uniquePhone } from "../helpers";
import {
  registerWithPhone,
  type RegisterOutcome,
} from "../../../src/modules/auth/service";

/** expect 断言不改类型，判别联合经 throw 收窄（与 service.test.ts 同法） */
function expectRegisteredOk(outcome: RegisterOutcome): asserts outcome is Extract<RegisterOutcome, { ok: true }> {
  if (!outcome.ok) {
    throw new Error("unreachable: 注册应成功");
  }
}

/** 与 service.test.ts 一致的合法测试密码（PASSWORD_RE：字母+数字，8..20） */
const PASSWORD = "abcdefg1";

afterAll(async () => {
  await db.$client.end();
  if (redis.status === "ready") {
    await redis.quit();
  }
});

describe("R7：/sign-in/phone-number 三失败情形同文案（Review Focus #1）", () => {
  it("未注册号/错密码/空密码：同状态码 + 同 code + 同 message，无差异字样", async () => {
    const phone = uniquePhone();
    const registered = await registerWithPhone({ phone, password: PASSWORD });
    expectRegisteredOk(registered);

    const cases = [
      { phoneNumber: uniquePhone(), password: PASSWORD }, // ① 未注册号 + 任意密码
      { phoneNumber: phone, password: "zzzzzzz9" }, // ② 已注册号 + 错密码
      { phoneNumber: phone, password: "" }, // ③ 已注册号 + 空密码（绕过前端直连）
    ];
    const responses = await Promise.all(
      cases.map((body) => directPost("/sign-in/phone-number", body)),
    );
    const bodies = await Promise.all(
      responses.map(async (res) => await res.json()),
    );

    // 三者 HTTP 状态码相同
    const statuses = new Set(responses.map((res) => res.status));
    expect([...statuses]).toHaveLength(1);

    // 响应体错误标识（code 与 message）完全一致
    const codes = new Set(bodies.map((body) => body.code));
    const messages = new Set(bodies.map((body) => body.message));
    expect([...codes]).toHaveLength(1);
    expect([...messages]).toHaveLength(1);

    // R7 纪律：不出现「未注册」「密码错误」类差异字样（含同族英文变体）
    const text = JSON.stringify(bodies);
    expect(text).not.toMatch(
      /未注册|密码错误|不存在|not exist|not registered|unregistered/i,
    );
  });
});

describe("hook 403：邮箱端点禁用（B2/非目标 #4）", () => {
  it("/sign-up/email 与 /sign-in/email 直连均 403", async () => {
    const email = `${uniquePhone()}@phone.styb.invalid`;
    const body = { email, password: PASSWORD, name: "hook-test" };

    const signUpRes = await directPost("/sign-up/email", body);
    const signInRes = await directPost("/sign-in/email", {
      email,
      password: PASSWORD,
    });

    expect(signUpRes.status).toBe(403);
    expect(signInRes.status).toBe(403);
  });
});

describe("登录成功双写（B5）", () => {
  it("200 + set-cookie；PG session 行与 Redis 会话键同时存在", async () => {
    const phone = uniquePhone();
    const registered = await registerWithPhone({ phone, password: PASSWORD });
    expectRegisteredOk(registered);

    const res = await directPost("/sign-in/phone-number", {
      phoneNumber: phone,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().length).toBeGreaterThan(0);

    // PG 双写：session 行存在（user_id/expires_at）
    const rows = await db
      .select()
      .from(session)
      .where(eq(session.userId, registered.userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Redis（secondaryStorage，keyPrefix 'better-auth:'）：存在含会话 token 的键
    const token = rows[0].token;
    const keys = await redis.keys("better-auth:*");
    expect(keys.some((key) => key.includes(token))).toBe(true);
  });
});

describe("退出失效（R11 服务端半边）", () => {
  it("sign-out 后旧 cookie get-session 无用户，Redis 键与 PG 行均删", async () => {
    const phone = uniquePhone();
    const registered = await registerWithPhone({ phone, password: PASSWORD });
    expectRegisteredOk(registered);

    const cookie = await signInAndGetCookie(phone, PASSWORD);

    // 登录后双写就位：PG 行 + Redis 键（作为退出断言的前置事实）
    const rowsBefore = await db
      .select()
      .from(session)
      .where(eq(session.userId, registered.userId));
    expect(rowsBefore).toHaveLength(1);
    const token = rowsBefore[0].token;
    expect(
      (await redis.keys("better-auth:*")).some((key) => key.includes(token)),
    ).toBe(true);

    // 退出：携 cookie POST /sign-out → 200
    const signOutRes = await directPost("/sign-out", {}, cookie);
    expect(signOutRes.status).toBe(200);

    // 旧 cookie 直连 get-session：响应不含用户
    const sessionRes = await directPost("/get-session", {}, cookie);
    const sessionBody = await sessionRes.json();
    expect(sessionBody?.user ?? null).toBeNull();

    // Redis 会话键已删
    const remaining = (await redis.keys("better-auth:*")).filter((key) =>
      key.includes(token),
    );
    expect(remaining).toHaveLength(0);

    // PG session 行已删
    const rowsAfter = await db
      .select()
      .from(session)
      .where(eq(session.userId, registered.userId));
    expect(rowsAfter).toHaveLength(0);
  });
});

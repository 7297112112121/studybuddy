/**
 * Better Auth 端点接口测试（design「Review Focus #1/#2」）。
 *
 * 覆盖：
 * 1. R7 三情形同文案（Review Focus #1）：/sign-in/username 对
 *    「未注册账户名 / 错密码 / 空密码直连 POST」返回同状态码 + 同 code +
 *    同 message，无账号存在性探测面（design 开放问题 #1 闭合点）；
 * 2. hook 403 三路径：邮箱注册/登录端点与 /is-username-available 被
 *    lib/better-auth.server.ts before hook 拦死（B2；后者为 R7 不可探测纪律下的
 *    账户名枚举面）；
 * 3. immutable 守卫：immutableUsername=true 时已登录会话携新 username
 *    直连 /update-user 被拒（4xx），库内 username 不变（负空间无改名语义）；
 * 4. 登录成功双写（B5）：PG session 行 + Redis（secondaryStorage）会话键；
 * 5. 退出失效（R11 服务端半边）：sign-out 后旧 cookie get-session 无用户、
 *    Redis 会话键与 PG session 行均删；
 * 6. 会话链路正读（接替 queries.test.ts 直测面，形状映射归单测 toAuthSession）：
 *    登录后 get-session 返回会话用户。
 *
 * 各用例独立 uniqueUsername() 造号。限流说明：内置 specialRule
 * （/sign-in 前缀 3 次/10 秒）默认仅 production 启用
 * （rateLimit.enabled ?? isProduction，vitest 环境为 test），接口测试不触发。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/common/db";
import { session, user } from "@/db/schema";
import { auth } from "@/auth/better-auth.server";
import { redis } from "@/common/redis";
import { directPost, signInAndGetCookie } from "../helpers";
import { uniqueUsername } from "../../support/username";
import { registerWithUsername } from "@/auth/service";

/** 注册测试账号并回读 user id(注册成功无载荷,userId 由库内取)。 */
async function registerTestUser(input: {
  username: string;
  password: string;
}): Promise<string> {
  await registerWithUsername(input);
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, input.username));
  if (rows.length !== 1) {
    throw new Error("unreachable: 注册应落库");
  }
  return rows[0]!.id;
}

/** 与 service.test.ts 一致的合法测试密码（PASSWORD_RE：字母+数字，8..20） */
const PASSWORD = "abcdefg1";

/**
 * GET 基座：directPost 仅覆盖 POST，get-session 语义为 GET（Task 7 卡）。
 * 构造方式与 helpers.directPost 同源（basePath '/api/auth' + 受信任 origin）。
 */
async function directGetSession(cookie: string): Promise<Response> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return auth.handler(
    new Request(`${base}/api/auth/get-session`, {
      method: "GET",
      headers: { cookie, origin: base },
    }),
  );
}

afterAll(async () => {
  await db.$client.end();
  if (redis.status === "ready") {
    await redis.quit();
  }
});

describe("R7：/sign-in/username 三失败情形同文案（Review Focus #1）", () => {
  it("未注册账户名/错密码/空密码：同状态码 + 同 code + 同 message，无差异字样", async () => {
    const username = uniqueUsername();
    await registerTestUser({ username, password: PASSWORD });

    const cases = [
      { username: uniqueUsername(), password: PASSWORD }, // ① 未注册账户名 + 任意密码
      { username, password: "zzzzzzz9" }, // ② 已注册账户名 + 错密码
      { username, password: "" }, // ③ 已注册账户名 + 空密码（绕过前端直连）
    ];
    const responses = await Promise.all(
      cases.map((body) => directPost("/sign-in/username", body)),
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

describe("hook 403：三路径直连禁用（B2/非目标 #4）", () => {
  it("/sign-up/email、/sign-in/email、/is-username-available 直连均 403", async () => {
    const email = "hook-test@user.styb.invalid";
    const signUpRes = await directPost("/sign-up/email", {
      email,
      password: PASSWORD,
      name: "hook-test",
    });
    const signInRes = await directPost("/sign-in/email", {
      email,
      password: PASSWORD,
    });
    const availableRes = await directPost("/is-username-available", {
      username: uniqueUsername(),
    });

    expect(signUpRes.status).toBe(403);
    expect(signInRes.status).toBe(403);
    expect(availableRes.status).toBe(403);
  });
});

describe("immutable 守卫：/update-user 携 username 改名拒绝（负空间无改名语义）", () => {
  it("已登录会话 POST /update-user（含新 username）→ 4xx，库内 username 不变", async () => {
    const username = uniqueUsername();
    const userId = await registerTestUser({ username, password: PASSWORD });

    const cookie = await signInAndGetCookie(username, PASSWORD);

    const res = await directPost(
      "/update-user",
      { username: uniqueUsername() },
      cookie,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    // 库内核验：username 保持注册原值，未被改名
    const rows = await db.select().from(user).where(eq(user.id, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].username).toBe(username);
  });
});

describe("登录成功双写（B5）", () => {
  it("200 + set-cookie；PG session 行与 Redis 会话键同时存在", async () => {
    const username = uniqueUsername();
    const userId = await registerTestUser({ username, password: PASSWORD });

    const res = await directPost("/sign-in/username", {
      username,
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().length).toBeGreaterThan(0);

    // PG 双写：session 行存在（user_id/expires_at）
    const rows = await db
      .select()
      .from(session)
      .where(eq(session.userId, userId));
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
    const username = uniqueUsername();
    const userId = await registerTestUser({ username, password: PASSWORD });

    const cookie = await signInAndGetCookie(username, PASSWORD);

    // 登录后双写就位：PG 行 + Redis 键（作为退出断言的前置事实）
    const rowsBefore = await db
      .select()
      .from(session)
      .where(eq(session.userId, userId));
    expect(rowsBefore).toHaveLength(1);
    const token = rowsBefore[0].token;
    expect(
      (await redis.keys("better-auth:*")).some((key) => key.includes(token)),
    ).toBe(true);

    // 退出：携 cookie POST /sign-out → 200
    const signOutRes = await directPost("/sign-out", {}, cookie);
    expect(signOutRes.status).toBe(200);

    // 旧 cookie 直连 get-session（GET）：响应不含用户
    const sessionRes = await directGetSession(cookie);
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
      .where(eq(session.userId, userId));
    expect(rowsAfter).toHaveLength(0);
  });
});

describe("会话链路正读（queries.test.ts 直测面并轨，形状映射归单测 toAuthSession）", () => {
  it("登录后 get-session → user.username=账户名，expiresAt 晚于当前", async () => {
    const username = uniqueUsername();
    await registerTestUser({ username, password: PASSWORD });
    const cookie = await signInAndGetCookie(username, PASSWORD);

    const sessionRes = await directGetSession(cookie);
    expect(sessionRes.status).toBe(200);
    const body = (await sessionRes.json()) as {
      user: { username: string | null };
      session: { expiresAt: string };
    };
    expect(body.user?.username).toBe(username);
    expect(new Date(body.session.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });
});

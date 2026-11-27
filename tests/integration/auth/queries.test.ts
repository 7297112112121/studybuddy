/**
 * getCurrentSession 集成测试（Task 6 换装，design「modules/auth/queries.ts」契约）。
 *
 * 真实会话链路（PG + Redis secondaryStorage）+ vi.mock('next/headers')：
 * queries.ts 的唯一外部依赖 headers() 来自 next/headers，RSC 运行时才有值，
 * 测试中用 mock 的 Headers 实例注入 cookie，其余（auth.api.getSession →
 * Redis/PG）全部走真实实现。
 *
 * 覆盖：无 cookie → null；登录后携该 cookie → AuthSession 形状
 * （user.id/name=账户名/username、session.id/userId/expiresAt instanceof Date）。
 */
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/common/db";
import { user } from "@/db/schema";
import { redis } from "@/common/redis";

const headerStore = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  // Next 16 的 headers() 为 async，返回只读 Headers 实例（dist/docs/headers.md）
  headers: async () => headerStore.current,
}));

import { signInAndGetCookie } from "../helpers";
import { uniqueUsername } from "../../support/username";
import { registerWithUsername } from "@/auth/service";
import { getCurrentSession } from "@/auth/queries";

const PASSWORD = "abcdefg1"; // 与 service.test.ts 一致（PASSWORD_RE：字母+数字，8..20）

afterAll(async () => {
  await db.$client.end();
  if (redis.status === "ready") {
    await redis.quit();
  }
});

beforeEach(() => {
  headerStore.current = new Headers();
});

describe("getCurrentSession（tests/integration/auth/queries）", () => {
  it("无 cookie（headers 空）→ null", async () => {
    expect(await getCurrentSession()).toBeNull();
  });

  it("登录后携该 cookie → AuthSession 形状（user.name=账户名，expiresAt 为 Date）", async () => {
    const username = uniqueUsername();
    await registerWithUsername({ username, password: PASSWORD });
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username));
    const userId = rows[0]!.id;
    const cookie = await signInAndGetCookie(username, PASSWORD);
    headerStore.current = new Headers({ cookie });

    const result = await getCurrentSession();

    expect(result).not.toBeNull();
    const s = result!;
    expect(s.user.id).toBe(userId);
    expect(s.user.name).toBe(username);
    expect(s.user.username).toBe(username);
    expect(s.session.id).toEqual(expect.any(String));
    expect(s.session.userId).toBe(userId);
    expect(s.session.expiresAt).toBeInstanceOf(Date);
    expect(s.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

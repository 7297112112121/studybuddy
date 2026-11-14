/**
 * getCurrentSession 集成测试（Task 7，design「modules/auth/queries.ts」契约）。
 *
 * 真实会话链路（PG + Redis secondaryStorage）+ vi.mock('next/headers')：
 * queries.ts 的唯一外部依赖 headers() 来自 next/headers，RSC 运行时才有值，
 * 测试中用 mock 的 Headers 实例注入 cookie，其余（auth.api.getSession →
 * Redis/PG）全部走真实实现。
 *
 * 覆盖：无 cookie → null；登录后携该 cookie → AuthSession 形状
 * （user.id/name=手机号/phoneNumber、session.id/userId/expiresAt instanceof Date）。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db/client";
import { redis } from "@/lib/redis";

const headerStore = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  // Next 16 的 headers() 为 async，返回只读 Headers 实例（dist/docs/headers.md）
  headers: async () => headerStore.current,
}));

import { signInAndGetCookie, uniquePhone } from "../helpers";
import { registerWithPhone } from "../../../src/modules/auth/service";
import { getCurrentSession } from "../../../src/modules/auth/queries";

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

  it("登录后携该 cookie → AuthSession 形状（user.name=手机号，expiresAt 为 Date）", async () => {
    const phone = uniquePhone();
    const registered = await registerWithPhone({ phone, password: PASSWORD });
    if (!registered.ok) {
      throw new Error("unreachable: 注册应成功");
    }
    const cookie = await signInAndGetCookie(phone, PASSWORD);
    headerStore.current = new Headers({ cookie });

    const result = await getCurrentSession();

    expect(result).not.toBeNull();
    const s = result!;
    expect(s.user.id).toBe(registered.userId);
    expect(s.user.name).toBe(phone);
    expect(s.user.phoneNumber).toBe(phone);
    expect(s.session.id).toEqual(expect.any(String));
    expect(s.session.userId).toBe(registered.userId);
    expect(s.session.expiresAt).toBeInstanceOf(Date);
    expect(s.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

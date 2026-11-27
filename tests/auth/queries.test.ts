/**
 * toAuthSession 纯映射单元测试(零 mock、零外部依赖):Better Auth 原始
 * 载荷 → AuthSession 的字段拣选与归一——null 透传、原始多余字段不泄漏、
 * username 可空归一空串、expiresAt 归一 Date 实例。
 * (真实会话链路由端点轨 tests/endpoint/auth/endpoints.test.ts 直调覆盖)
 */
import { describe, expect, it } from "vitest";

import { toAuthSession } from "@/auth/queries";

/** 与 toAuthSession 入参同形的原始载荷构造基座(字段满足拣选所需即可)。 */
function rawSession(overrides?: {
  username?: string | null;
  expiresAt?: string;
}) {
  return {
    user: {
      id: "u1",
      name: "alice",
      email: "alice@placeholder.invalid",
      emailVerified: false,
      image: null,
      username: overrides && overrides.username !== undefined ? overrides.username : "alice",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    session: {
      id: "s1",
      userId: "u1",
      token: "tok",
      expiresAt: overrides?.expiresAt ?? "2027-01-01T00:00:00.000Z",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  // expiresAt 以字符串注入钉住运行时防御分支;声明类型标 Date,需经 unknown 中转
  } as unknown as Parameters<typeof toAuthSession>[0];
}

describe("toAuthSession（tests/auth/queries）", () => {
  it("null 载荷 → null（未登录透传）", () => {
    expect(toAuthSession(null)).toBeNull();
  });

  it("字段拣选：user/session 各取 3 字段，原始多余字段不泄漏", () => {
    expect(toAuthSession(rawSession())).toEqual({
      user: { id: "u1", name: "alice", username: "alice" },
      session: {
        id: "s1",
        userId: "u1",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      },
    });
  });

  it("username 可空归一：null → 空串（注册路径恒有值的防御位）", () => {
    const result = toAuthSession(rawSession({ username: null }));
    expect(result?.user.username).toBe("");
  });

  it("expiresAt 归一：字符串时间 → Date 实例", () => {
    const result = toAuthSession(
      rawSession({ expiresAt: "2026-12-31T00:00:00.000Z" }),
    );
    expect(result?.session.expiresAt).toBeInstanceOf(Date);
    expect(result?.session.expiresAt.getTime()).toBe(
      Date.parse("2026-12-31T00:00:00.000Z"),
    );
  });
});

/**
 * registerWithUsername 集成测试（Task 5，design「modules/auth/service.ts」契约）。
 *
 * 真实 Postgres（compose.dev.yaml），覆盖 R9/R10/R13/R14/R15 与 F-01：
 * 1. 注册成功——user/agreement 字段落库 + credential account 密码摘要（R9/R13/R15）；
 * 2. 同名再注册——23505 映射 USERNAME_ALREADY_REGISTERED，无重复行（R10）；
 * 3. 并发同名——恰一 ok 一 USERNAME_ALREADY_REGISTERED（R14）；
 * 4. 并发大小写变体——两行共存，user_username 区分大小写直证（R14/F-01）。
 * R13 日志纪律（不记录入参）属运行时行为，以查库断言密码不含明文间接守护。
 */
import { eq, inArray } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { account, user } from "@/db/schema";
import { uniqueUsername } from "../helpers";
import {
  AGREEMENT_VERSION,
  registerWithUsername,
  usernameToPlaceholderEmail,
} from "../../../src/modules/auth/service";

afterAll(async () => {
  await db.$client.end();
});

describe("registerWithUsername（tests/integration/auth/service）", () => {
  it("注册成功：user 行含 agreement 留痕，account 行为 credential 摘要（R9/R13/R15）", async () => {
    const startedAt = new Date();
    const username = uniqueUsername();
    const password = "abcdefg1";

    const result = await registerWithUsername({ username, password });

    expect(result).toEqual({ ok: true, userId: expect.any(String) });
    if (!result.ok) {
      throw new Error("unreachable: 收窄判别联合");
    }

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
    const u = users[0];
    expect(u.id).toBe(result.userId);
    expect(u.name).toBe(username);
    expect(u.email).toBe(usernameToPlaceholderEmail(username));
    expect(u.username).toBe(username);
    expect(u.agreementVersion).toBe(AGREEMENT_VERSION);
    expect(u.agreedAt.getTime()).toBeGreaterThan(startedAt.getTime());

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, u.id));
    expect(accounts).toHaveLength(1);
    const acc = accounts[0];
    expect(acc.providerId).toBe("credential");
    expect(acc.accountId).toBe(u.id);
    // R13：只存「盐:哈希」摘要，不含明文
    expect(acc.password).toMatch(/^\S+:\S+$/);
    expect(acc.password).not.toContain(password);
    expect(
      await verifyPassword({ hash: acc.password as string, password }),
    ).toBe(true);
  });

  it("同名再注册：USERNAME_ALREADY_REGISTERED，user 表恰 1 行（R10）", async () => {
    const username = uniqueUsername();
    const password = "abcdefg1";

    const first = await registerWithUsername({ username, password });
    expect(first.ok).toBe(true);
    const second = await registerWithUsername({ username, password });

    expect(second).toEqual({ ok: false, error: "USERNAME_ALREADY_REGISTERED" });
    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
  });

  it("并发同名：Promise.allSettled 恰一 ok 一 USERNAME_ALREADY_REGISTERED（R14）", async () => {
    const username = uniqueUsername();
    const password = "abcdefg1";

    const settled = await Promise.allSettled([
      registerWithUsername({ username, password }),
      registerWithUsername({ username, password }),
    ]);

    expect(settled).toHaveLength(2);
    for (const s of settled) {
      expect(s.status).toBe("fulfilled");
    }
    const outcomes = settled.map(
      (s) => (s as PromiseFulfilledResult<Awaited<ReturnType<typeof registerWithUsername>>>)
        .value,
    );
    const succeeded = outcomes.filter((o) => o.ok);
    expect(succeeded).toHaveLength(1);
    expect(
      outcomes.filter(
        (o) => !o.ok && o.error === "USERNAME_ALREADY_REGISTERED",
      ),
    ).toHaveLength(1);

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
  });

  it("并发大小写变体：大小写互变对两账号均 ok、两行共存（R14/F-01 区分大小写直证）", async () => {
    // uniqueUsername 全 [0-9a-z]，uppercase 后是逐字符大小写互变的合法变体对
    // （等价「Alice/alice」字面），跨运行唯一防残留串扰。
    const lower = uniqueUsername();
    const upper = lower.toUpperCase();
    const password = "abcdefg1";

    const settled = await Promise.allSettled([
      registerWithUsername({ username: lower, password }),
      registerWithUsername({ username: upper, password }),
    ]);

    expect(settled).toHaveLength(2);
    for (const s of settled) {
      expect(s.status).toBe("fulfilled");
    }
    const outcomes = settled.map(
      (s) => (s as PromiseFulfilledResult<Awaited<ReturnType<typeof registerWithUsername>>>)
        .value,
    );
    expect(outcomes.filter((o) => o.ok)).toHaveLength(2);

    const users = await db
      .select()
      .from(user)
      .where(inArray(user.username, [lower, upper]));
    expect(users).toHaveLength(2);
  });
});

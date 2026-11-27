/**
 * registerWithUsername 集成测试。
 *
 * 真实 Postgres（compose.dev.yaml），覆盖：
 * 1. 注册成功——user/agreement 字段落库 + credential account 密码摘要；
 * 2. 同名再注册——23505 抛契约化错误（ApiError），无重复行；
 * 3. 并发同名——恰一成功一抛契约化错误；
 * 4. 并发大小写变体——两行共存，user_username 区分大小写直证。
 * 日志纪律（不记录入参）属运行时行为，以查库断言密码不含明文间接守护。
 */
import { eq, inArray } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/common/db";
import { account, user } from "@/db/schema";
import { uniqueUsername } from "../../support/username";
import {
  registerWithUsername,
  usernameToPlaceholderEmail,
} from "@/auth/service";

afterAll(async () => {
  await db.$client.end();
});

describe("registerWithUsername（tests/integration/auth/service）", () => {
  it("注册成功：user 行含 agreement 留痕，account 行为 credential 摘要（R9/R13/R15）", async () => {
    const startedAt = new Date();
    const username = uniqueUsername();
    const password = "abcdefg1";

    await registerWithUsername({ username, password });

    const users = await db
      .select()
      .from(user)
      .where(eq(user.username, username));
    expect(users).toHaveLength(1);
    const u = users[0];
    expect(u.name).toBe(username);
    expect(u.email).toBe(usernameToPlaceholderEmail(username));
    expect(u.username).toBe(username);
    expect(u.agreementVersion).toBe("v1");
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

    await registerWithUsername({ username, password });
    await expect(
      registerWithUsername({ username, password }),
    ).rejects.toMatchObject({ code: "USERNAME_ALREADY_REGISTERED" });
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
    const rejected = settled.filter((s) => s.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "USERNAME_ALREADY_REGISTERED",
    });
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);

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

    expect(settled.map((s) => s.status)).toEqual(["fulfilled", "fulfilled"]);

    const users = await db
      .select()
      .from(user)
      .where(inArray(user.username, [lower, upper]));
    expect(users).toHaveLength(2);
  });
});

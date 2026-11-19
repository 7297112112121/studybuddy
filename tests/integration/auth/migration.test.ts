/**
 * username 迁移落库查证（Task 3，CR-20261116-1：凭据手机号→账户名+密码）。
 *
 * 真实 Postgres（compose.dev.yaml）查库断言，覆盖迁移生成物而非表定义对象：
 * 1. pg_indexes 含 user 表的唯一索引 user_username（且为 UNIQUE）；
 * 2. information_schema.columns：user 表含 notNull 的 username 列，
 *    不再含 phone_number / phone_number_verified；
 * 3. 大小写敏感性数据层直证——'Alice' 与 'alice' 两行共存
 *    （PG 的 citext 未启用、text 索引区分大小写），同事务内插入后回滚，
 *    不留残留数据。
 */
import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { user } from "@/db/schema";

afterAll(async () => {
  await db.$client.end();
});

describe("username 迁移落库（tests/integration/auth/migration）", () => {
  it("user 表存在唯一索引 user_username", async () => {
    const rows = await db.execute<{
      indexname: string;
      indexdef: string;
    }>(
      sql`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user'`,
    );

    const target = rows.find((r) => r.indexname === "user_username");
    expect(target).toBeDefined();
    expect(target?.indexdef).toContain("CREATE UNIQUE INDEX");
  });

  it("user 表含 username 列（notNull），手机号两列已删", async () => {
    const rows = await db.execute<{
      column_name: string;
      is_nullable: string;
    }>(
      sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user'`,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));

    expect(byName["username"]?.is_nullable).toBe("NO");
    expect(byName["phone_number"]).toBeUndefined();
    expect(byName["phone_number_verified"]).toBeUndefined();
  });

  it("username 大小写敏感：'Alice' 与 'alice' 共存（同事务回滚，无残留）", async () => {
    class RollbackSignal extends Error {}

    await expect(
      db.transaction(async (tx) => {
        const suffix = crypto.randomUUID().slice(0, 8);
        await tx.insert(user).values([
          {
            id: `migration-alice-upper-${suffix}`,
            name: "Alice",
            email: `migration-alice-${suffix}@case.styb.invalid`,
            username: "Alice",
            agreementVersion: "v1",
            agreedAt: new Date(),
          },
          {
            id: `migration-alice-lower-${suffix}`,
            name: "alice",
            email: `migration-alice-lower-${suffix}@case.styb.invalid`,
            username: "alice",
            agreementVersion: "v1",
            agreedAt: new Date(),
          },
        ]);

        const rows = await tx
          .select({ username: user.username })
          .from(user)
          .where(inArray(user.username, ["Alice", "alice"]));
        expect(rows).toHaveLength(2);
        expect(rows.map((r) => r.username).sort()).toEqual(["Alice", "alice"]);

        // 断言完成后抛信号回滚整个事务，两行不落库
        throw new RollbackSignal("断言完成，回滚");
      }),
    ).rejects.toThrow(RollbackSignal);
  });
});

/**
 * calendar_entry 迁移落库查证（AXY-22 Task 2，design「数据模型」节）。
 *
 * 真实 Postgres（compose.dev.yaml）查库断言，覆盖迁移生成物而非表定义对象：
 * 1. information_schema.columns：9 列名集恰等，关键列类型与可空性（uuid PK、
 *    entry_date date notNull、content/start_time/end_time 可空、时间戳列带时区）；
 * 2. pg_indexes 含复合索引 calendar_entry_user_date（非唯一，双列）；
 * 3. 无 DB 级 FK（跨模块引用按 barrel 裁决不建外键）。
 */
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/common/db";

afterAll(async () => {
  await db.$client.end();
});

describe("calendar_entry 迁移落库（tests/integration/calendar/migration）", () => {
  it("9 列名集恰等，关键列类型与可空性正确", async () => {
    const rows = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(
      sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_entry'`,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));

    expect(Object.keys(byName).sort()).toEqual(
      [
        "content",
        "created_at",
        "end_time",
        "entry_date",
        "id",
        "start_time",
        "title",
        "updated_at",
        "user_id",
      ].sort(),
    );
    expect(byName["id"]?.data_type).toBe("uuid");
    expect(byName["user_id"]).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    });
    expect(byName["entry_date"]).toMatchObject({
      data_type: "date",
      is_nullable: "NO",
    });
    expect(byName["title"]).toMatchObject({
      data_type: "text",
      is_nullable: "NO",
    });
    expect(byName["content"]).toMatchObject({
      data_type: "text",
      is_nullable: "YES",
    });
    expect(byName["start_time"]).toMatchObject({
      data_type: "time without time zone",
      is_nullable: "YES",
    });
    expect(byName["end_time"]).toMatchObject({
      data_type: "time without time zone",
      is_nullable: "YES",
    });
    expect(byName["created_at"]?.data_type).toBe("timestamp with time zone");
    expect(byName["updated_at"]?.data_type).toBe("timestamp with time zone");
  });

  it("pg_indexes 含复合索引 calendar_entry_user_date（非唯一，双列）", async () => {
    const rows = await db.execute<{
      indexname: string;
      indexdef: string;
    }>(
      sql`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'calendar_entry'`,
    );
    const target = rows.find((r) => r.indexname === "calendar_entry_user_date");
    expect(target).toBeDefined();
    expect(target?.indexdef).not.toContain("CREATE UNIQUE INDEX");
    expect(target?.indexdef).toContain("user_id");
    expect(target?.indexdef).toContain("entry_date");
  });

  it("calendar_entry 无 FOREIGN KEY 约束（user_id 不建外键）", async () => {
    const rows = await db.execute<{ constraint_type: string }>(
      sql`SELECT constraint_type FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'calendar_entry' AND constraint_type = 'FOREIGN KEY'`,
    );
    expect(rows).toHaveLength(0);
  });
});

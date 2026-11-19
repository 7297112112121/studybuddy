/**
 * T1:red 阶段直接输入——entry_resource 表/索引/FK 存在性与级联删除。
 * 迁移前:entryResource 未导出 + 表不存在,两半都红;迁移后全绿。
 */
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { calendarEntry, entryResource } from "@/modules/calendar/schema";

afterAll(async () => {
  await db.$client.end();
});

describe("entry_resource schema(T1)", () => {
  it("表存在且列齐全(id/entry_id/title/url/created_at)", async () => {
    const rows = await db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns
          where table_name = 'entry_resource'`,
    );
    const columns = rows.map((r) => r.column_name).sort();
    expect(columns).toEqual(["created_at", "entry_id", "id", "title", "url"]);
  });

  it("索引 entry_resource_entry_id 存在", async () => {
    const rows = await db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes
          where tablename = 'entry_resource'
            and indexname = 'entry_resource_entry_id'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("FK ON DELETE CASCADE:删除条目后资料行消失", async () => {
    const [entry] = await db
      .insert(calendarEntry)
      .values({
        userId: "t1-cascade-user",
        entryDate: "2026-11-20",
        title: "学习next框架",
      })
      .returning({ id: calendarEntry.id });

    await db.insert(entryResource).values({
      entryId: entry.id,
      title: "Next.js 官方基础教程",
      url: "https://example.com/next-tutorial",
    });

    await db.delete(calendarEntry).where(eq(calendarEntry.id, entry.id));

    const left = await db
      .select()
      .from(entryResource)
      .where(eq(entryResource.entryId, entry.id));
    expect(left).toHaveLength(0);
  });
});

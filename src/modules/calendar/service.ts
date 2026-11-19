/**
 * 文件作用:日历条目的写路径,提供单行增删改。
 *
 * 成员:
 * 1. 新建条目(createEntry):单行 INSERT 写入一条日历条目;
 * 2. 更新条目(updateEntry):单行 UPDATE,条件含归属校验;
 * 3. 删除条目(deleteEntry):单行 DELETE,条件含归属校验。
 *
 * 其他:
 * 1. 入参假定已经上游 zod 复验,本层不再校验;
 * 2. 每次写操作为单条 SQL,天然原子;
 * 3. 同日时间段可重叠,不做冲突检查;
 * 4. DB 异常向上抛,由 action 层归一为保存失败。
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { calendarEntry, type CalendarEntryInput } from "./schema";

/** 作用:单行 INSERT 写入一条日历条目;DB 异常向上抛,由 action 层归一。 */
export async function createEntry(
  userId: string,
  input: CalendarEntryInput,
): Promise<void> {
  await db.insert(calendarEntry).values({
    userId,
    entryDate: input.date,
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
  });
}

/**
 * 作用:单行 UPDATE,条件为 id 与 user_id 同时匹配;
 * 条目不存在或不属于该用户时,返回 false。
 */
export async function updateEntry(
  userId: string,
  entryId: string,
  input: CalendarEntryInput,
): Promise<boolean> {
  const rows = await db
    .update(calendarEntry)
    .set({
      entryDate: input.date,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .returning({ id: calendarEntry.id });
  return rows.length > 0;
}

/**
 * 作用:单行 DELETE,条件同更新;
 * 条目不存在或不属于该用户时,返回 false。
 */
export async function deleteEntry(
  userId: string,
  entryId: string,
): Promise<boolean> {
  const rows = await db
    .delete(calendarEntry)
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .returning({ id: calendarEntry.id });
  return rows.length > 0;
}

/**
 * calendar 写路径（AXY-22 design「契约」节）：入参假定已经 zod 校验
 * （calendarEntryInputSchema 复验在 actions 层），service 不再校验。
 *
 * 每次写操作为单条 SQL（单行 INSERT/UPDATE/DELETE），天然原子（边界 #7）；
 * 同日时间段可重叠、无冲突检查（D-05，边界 #3）。DB 异常向上抛，
 * 由 action 归一为 SAVE_FAILED。
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";

import { calendarEntry, type CalendarEntryInput } from "./schema";

/** 单行 INSERT；DB 异常向上抛，由 action 归一为 SAVE_FAILED。 */
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

/** 单行 UPDATE，WHERE id = entryId AND user_id = userId；false = 条目不存在或不属该用户（R7）。 */
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
    .where(
      and(
        eq(calendarEntry.id, entryId),
        eq(calendarEntry.userId, userId),
      ),
    )
    .returning({ id: calendarEntry.id });
  return rows.length > 0;
}

/** 单行 DELETE，同 WHERE；false = 条目不存在或不属该用户（R7）。 */
export async function deleteEntry(
  userId: string,
  entryId: string,
): Promise<boolean> {
  const rows = await db
    .delete(calendarEntry)
    .where(
      and(
        eq(calendarEntry.id, entryId),
        eq(calendarEntry.userId, userId),
      ),
    )
    .returning({ id: calendarEntry.id });
  return rows.length > 0;
}

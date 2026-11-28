/**
 * 文件作用:日历条目写路径 service(统一接口端点调用,Drizzle ORM 封装)。
 * 视图导航日期数学已并入 features/calendar/utils.ts。
 */
import { and, eq } from "drizzle-orm";

import { API_ERROR, ApiError } from "@/common/error";
import { db } from "@/common/db";
import { calendarEntry } from "@/db/schema";

import type { CalendarEntryInput } from "@/app/api/calendar/request";

/** 作用:单行 INSERT 写入一条日历条目;DB 异常向上抛,由端点归一流归一。 */
export async function createEntry(
  userId: string,
  input: CalendarEntryInput,
): Promise<void> {
  await db.insert(calendarEntry).values({
    userId,
    entryDate: input.date,
    title: input.title,
    content: input.content,
    startTime: input.startTime,
    endTime: input.endTime,
  });
}

/** 单行 UPDATE,条件为 id 与 user_id 同时匹配;条目不存在或不属于该用户时抛未找到(NOT_FOUND)。 */
export async function updateEntry(
  userId: string,
  entryId: string,
  input: CalendarEntryInput,
): Promise<void> {
  const rows = await db
    .update(calendarEntry)
    .set({
      entryDate: input.date,
      title: input.title,
      content: input.content,
      startTime: input.startTime,
      endTime: input.endTime,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .returning({ id: calendarEntry.id });
  if (rows.length === 0) {
    throw new ApiError(API_ERROR.NOT_FOUND);
  }
}

/** 单行 DELETE,条件同更新;条目不存在或不属于该用户时抛未找到(NOT_FOUND)。 */
export async function deleteEntry(
  userId: string,
  entryId: string,
): Promise<void> {
  const rows = await db
    .delete(calendarEntry)
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .returning({ id: calendarEntry.id });
  if (rows.length === 0) {
    throw new ApiError(API_ERROR.NOT_FOUND);
  }
}

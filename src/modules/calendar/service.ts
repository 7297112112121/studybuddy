/**
 * 文件作用:日历条目写路径与视图导航日期数学。
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { MS_PER_DAY, formatUtcDate } from "@/lib/date";

import { calendarEntry } from "./schema";
import { isValidDateString, type CalendarEntryInput } from "./validators";
import type { WeekDay, WeekdayKey } from "./useClientScreen";

/** 作用:单行 INSERT 写入一条日历条目;DB 异常向上抛,由 action 层归一。 */
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
      content: input.content,
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

/** 作用:月份加减,delta 可正可负,自动进退位。 */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 作用:给出日期所在周的周一;date 不是合法 "YYYY-MM-DD" 时,抛 RangeError。 */
export function weekStartFor(date: string): string {
  if (!isValidDateString(date)) {
    throw new RangeError(`invalid date: ${date}`);
  }
  const [year, month, day] = date.split("-").map(Number);
  // 该日星期(周日为 0),换算为周一首日的偏移天数(周一为 0)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = (weekday + 6) % 7;
  return formatUtcDate(Date.UTC(year, month - 1, day) - offset * MS_PER_DAY);
}

/** 作用:由周一锚点给出周内 7 天,列序周一首,并逐日标记是否今天。 */
export function buildWeekDays(weekStart: string, today: string): WeekDay[] {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return WEEKDAY_KEYS.map((weekdayKey, i) => {
    const date = formatUtcDate(startMs + i * MS_PER_DAY);
    return { date, weekdayKey, isToday: date === today };
  });
}

/** 作用:周一锚点加减 delta 周,跨月跨年由 UTC 毫秒运算兜住。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatUtcDate(startMs + delta * 7 * MS_PER_DAY);
}

const WEEKDAY_KEYS: WeekdayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

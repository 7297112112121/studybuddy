/**
 * calendar 读路径（AXY-22 design「契约」节）：RSC page 直接调用。
 *
 * 仅本人——R6/R7 的数据半边：查询恒带 userId 条件，不收客户端未过滤集。
 * DB 异常向上抛（页面渲染失败由 Next 错误边界兜底），本层不做归一。
 */
import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";

import { formatHhmm, monthRange } from "./month";
import { calendarEntry } from "./schema";
import { weekRange } from "./week";

export type CalendarEntryView = {
  id: string;
  date: string; // entryDate，"YYYY-MM-DD"
  title: string;
  startTime: string | null; // "HH:MM" 或 null
  endTime: string | null; // "HH:MM" 或 null
};

/** 同日排序：不带时间在前、带时间按 startTime 升序（演示态 4「按开始时间先后并列」）。 */
function compareEntries(
  a: CalendarEntryView,
  b: CalendarEntryView,
): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startTime === null && b.startTime === null) return 0;
  if (a.startTime === null) return -1;
  if (b.startTime === null) return 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

/** 按账号 + 月区间读条目；排序 entryDate 升序、同日按 compareEntries。 */
export async function listMonthEntries(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarEntryView[]> {
  const { start, end } = monthRange(year, month);
  const rows = await db
    .select({
      id: calendarEntry.id,
      date: calendarEntry.entryDate,
      title: calendarEntry.title,
      startTime: calendarEntry.startTime,
      endTime: calendarEntry.endTime,
    })
    .from(calendarEntry)
    .where(
      and(
        eq(calendarEntry.userId, userId),
        gte(calendarEntry.entryDate, start),
        lte(calendarEntry.entryDate, end),
      ),
    );

  return rows
    .map((r) => ({
      ...r,
      startTime: r.startTime === null ? null : formatHhmm(r.startTime),
      endTime: r.endTime === null ? null : formatHhmm(r.endTime),
    }))
    .sort(compareEntries);
}

/** 按账号 + 周区间读条目(AXY-23);排序与 listMonthEntries 一致;恒带 userId 条件。 */
export async function listWeekEntries(
  userId: string,
  weekStart: string,
): Promise<CalendarEntryView[]> {
  const { start, end } = weekRange(weekStart);
  const rows = await db
    .select({
      id: calendarEntry.id,
      date: calendarEntry.entryDate,
      title: calendarEntry.title,
      startTime: calendarEntry.startTime,
      endTime: calendarEntry.endTime,
    })
    .from(calendarEntry)
    .where(
      and(
        eq(calendarEntry.userId, userId),
        gte(calendarEntry.entryDate, start),
        lte(calendarEntry.entryDate, end),
      ),
    );

  return rows
    .map((r) => ({
      ...r,
      startTime: r.startTime === null ? null : formatHhmm(r.startTime),
      endTime: r.endTime === null ? null : formatHhmm(r.endTime),
    }))
    .sort(compareEntries);
}

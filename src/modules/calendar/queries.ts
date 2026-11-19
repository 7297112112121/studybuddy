/**
 * calendar 读路径（AXY-22 design「契约」节）：RSC page 直接调用。
 *
 * 仅本人——R6/R7 的数据半边：查询恒带 userId 条件，不收客户端未过滤集。
 * DB 异常向上抛（页面渲染失败由 Next 错误边界兜底），本层不做归一。
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/db/client";

import { formatHhmm, monthRange } from "./month";
import { calendarEntry, entryResource } from "./schema";
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

/**
 * 闭区间读条目主体（月/周共用）：恒带 userId 条件（R7 数据半边）、
 * formatHhmm 归一时间列、compareEntries 排序。月/周入口只负责区间推导。
 */
async function listEntriesInRange(
  userId: string,
  start: string,
  end: string,
): Promise<CalendarEntryView[]> {
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

/** 按账号 + 月区间读条目；排序 entryDate 升序、同日按 compareEntries。 */
export async function listMonthEntries(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarEntryView[]> {
  const { start, end } = monthRange(year, month);
  return listEntriesInRange(userId, start, end);
}

/** 按账号 + 周区间读条目(AXY-23);排序与 listMonthEntries 一致;恒带 userId 条件。 */
export async function listWeekEntries(
  userId: string,
  weekStart: string,
): Promise<CalendarEntryView[]> {
  const { start, end } = weekRange(weekStart);
  return listEntriesInRange(userId, start, end);
}

/** 条目附属资料视图(AXY-24):仅标题与 URL。 */
export type EntryResourceView = { title: string; url: string };

/**
 * 按条目 id 分组读本人条目资料(AXY-24 T7):经条目 join 传导账号隔离
 * (资料表无 user_id,归属由条目 user_id 决定,R11);dates 为空直接短路。
 */
export async function listEntryResources(
  userId: string,
  dates: string[],
): Promise<Map<string, EntryResourceView[]>> {
  if (dates.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({
      entryId: entryResource.entryId,
      title: entryResource.title,
      url: entryResource.url,
    })
    .from(entryResource)
    .innerJoin(calendarEntry, eq(entryResource.entryId, calendarEntry.id))
    .where(
      and(
        eq(calendarEntry.userId, userId),
        inArray(calendarEntry.entryDate, dates),
      ),
    );

  const grouped = new Map<string, EntryResourceView[]>();
  for (const row of rows) {
    const list = grouped.get(row.entryId);
    if (list) {
      list.push({ title: row.title, url: row.url });
    } else {
      grouped.set(row.entryId, [{ title: row.title, url: row.url }]);
    }
  }
  return grouped;
}

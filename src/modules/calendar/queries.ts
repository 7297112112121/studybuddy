/**
 * 日历读路径的数据库查询(统一接口端点调用);
 * 入参校验统一在契约切面完成,查询信任切面产出的合法入参。
 */
import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/common/db";
import { calendarEntry } from "@/db/schema";
import { daysInMonth, formatUtcDate, MS_PER_DAY } from "@/common/date";

/** 作用:给出该月的日期闭区间("YYYY-MM-DD"),作为月度条目查询的入参来源。 */
export function monthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`,
  };
}

/** 作用:由周一锚点给出该周闭区间(周一至周日),作为周度条目查询的入参来源。 */
export function weekRange(weekStart: string): { start: string; end: string } {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return {
    start: weekStart,
    end: formatUtcDate(startMs + 6 * MS_PER_DAY),
  };
}

/** 作用:按账号与月份区间读条目,排序为日期升序、同日按开始时间先后。 */
export async function listMonthEntries(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarEntryView[]> {
  const { start, end } = monthRange(year, month);
  return listEntriesInRange(userId, start, end);
}

/** 作用:按账号与周区间读条目,排序与月度条目查询一致。 */
export async function listWeekEntries(
  userId: string,
  weekStart: string,
): Promise<CalendarEntryView[]> {
  const { start, end } = weekRange(weekStart);
  return listEntriesInRange(userId, start, end);
}

/** 作用:"HH:MM:SS" 截短为 "HH:MM"(time 列查询结果归一,秒位不泄漏到 UI)。 */
export function formatHhmm(time: string): string {
  return time.slice(0, 5);
}

export type CalendarEntryView = {
  id: string;
  date: string; // 即数据库列 entryDate,"YYYY-MM-DD"
  title: string;
  content: string | null; // 具体内容,纯文本;null 表示未填写
  startTime: string | null; // "HH:MM" 或 null
  endTime: string | null; // "HH:MM" 或 null
};

/**
 * 作用:按账号读闭区间内的条目主体,供月度与周度查询共用;
 * 查询恒带 userId 条件,时间列归一为 "HH:MM" 并按同日规则排序。
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
      content: calendarEntry.content,
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
    .map((row) => ({
      ...row,
      startTime: row.startTime === null ? null : formatHhmm(row.startTime),
      endTime: row.endTime === null ? null : formatHhmm(row.endTime),
    }))
    .sort(compareEntries);
}

/** 作用:同日排序比较——不带时间的条目在前,带时间按开始时间升序。 */
function compareEntries(a: CalendarEntryView, b: CalendarEntryView): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.startTime === null && b.startTime === null) return 0;
  if (a.startTime === null) return -1;
  if (b.startTime === null) return 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

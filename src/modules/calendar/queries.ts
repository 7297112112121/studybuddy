/**
 * 文件作用:日历读路径的数据库查询,RSC 页面直接调用;
 * 读入参在查询入口做服务端校验(规则单一来源 validators.ts)。
 */
import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { daysInMonth, formatUtcDate, MS_PER_DAY } from "@/lib/date";

import { calendarEntry } from "./schema";
import {
  isValidEntryId,
  isValidWeekStart,
  isValidYearMonth,
} from "./validators";

/** 业务错误名:条目不存在或不属于该用户;调用方按 name 判别归一为未找到(NOT_FOUND)。 */
export const ENTRY_NOT_FOUND = "EntryNotFoundError";

/** 业务错误名:读入参未过服务端校验;调用方按 name 判别,属编程错误而非 UI 文案来源。 */
export const ENTRY_INVALID_INPUT = "EntryInvalidInputError";

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
  assertValidInput(isValidYearMonth(year, month), "year/month");
  const { start, end } = monthRange(year, month);
  return listEntriesInRange(userId, start, end);
}

/** 作用:按账号与周区间读条目,排序与月度条目查询一致。 */
export async function listWeekEntries(
  userId: string,
  weekStart: string,
): Promise<CalendarEntryView[]> {
  assertValidInput(isValidWeekStart(weekStart), "weekStart");
  const { start, end } = weekRange(weekStart);
  return listEntriesInRange(userId, start, end);
}

export type CalendarEntryView = {
  id: string;
  date: string; // 即数据库列 entryDate,"YYYY-MM-DD"
  title: string;
  startTime: string | null; // "HH:MM" 或 null
  endTime: string | null; // "HH:MM" 或 null
};

/**
 * 作用:读取指定条目的 id 与标题,查询必须带 userId 条件;
 * 入参先过服务端校验(条目 id 须为 uuid 形状);条目不存在或不属于
 * 该用户时,抛条目不存在错误(EntryNotFoundError)。
 */
export async function readEntry(
  userId: string,
  entryId: string,
): Promise<{ id: string; title: string }> {
  assertValidInput(isValidEntryId(entryId), "entryId");
  const rows = await db
    .select({ id: calendarEntry.id, title: calendarEntry.title })
    .from(calendarEntry)
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    // 业务错误零 class:name 标识供调用方判别,不泄漏条目存在性
    throw Object.assign(new Error("entry not found for user"), {
      name: ENTRY_NOT_FOUND,
    });
  }
  return rows[0];
}

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

/**
 * 作用:读路径入参守卫,单一收拢点(与 actions 的会话守卫同风格);
 * 规则来自 validators.ts,非法入参抛入参无效错误(EntryInvalidInputError)。
 */
function assertValidInput(valid: boolean, param: string): void {
  if (!valid) {
    throw Object.assign(new Error(`invalid query input: ${param}`), {
      name: ENTRY_INVALID_INPUT,
    });
  }
}

/** 作用:"HH:MM:SS" 截短为 "HH:MM"(time 列查询结果归一,秒位不泄漏到 UI)。 */
export function formatHhmm(time: string): string {
  return time.slice(0, 5);
}

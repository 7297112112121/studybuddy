/**
 * 文件作用:日历读路径的数据库查询,RSC 页面直接调用。
 *
 * 成员:
 * 1. 月度条目查询(listMonthEntries):按账号读一个月的条目视图;
 * 2. 周度条目查询(listWeekEntries):按账号读一周的条目视图;
 * 3. 条目资料查询(listEntryResources):按日期读条目附属资料并按条目分组;
 * 4. 条目视图(CalendarEntryView):条目列表单行结构;
 * 5. 资料视图(EntryResourceView):附属资料的标题与网址结构。
 *
 * 其他:
 * 1. 仅本人可见:查询恒带 userId 条件,不收客户端未过滤集合;
 * 2. 数据库异常向上抛,页面渲染失败由 Next 错误边界兜底,本层不做归一。
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/db/client";

import { formatHhmm, monthRange } from "./month";
import { calendarEntry, entryResource } from "./schema";
import { weekRange } from "./week";

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

/**
 * 作用:按条目 id 分组读本人条目的附属资料。
 * 流程:
 * 1. 日期列表为空时直接返回空映射;
 * 2. 资料表经条目表连接传导账号隔离(资料表无 userId,归属由条目决定);
 * 3. 结果按条目 id 分组返回。
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

export type CalendarEntryView = {
  id: string;
  date: string; // 即数据库列 entryDate,"YYYY-MM-DD"
  title: string;
  startTime: string | null; // "HH:MM" 或 null
  endTime: string | null; // "HH:MM" 或 null
};

export type EntryResourceView = { title: string; url: string };

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

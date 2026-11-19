/**
 * 文件作用:日历周视图的日期与布局纯函数。
 *
 * 成员:
 * 1. 周一锚点(weekStartFor):给出日期所在周的周一;
 * 2. 周内单日列表构建(buildWeekDays):给出周内 7 天列表;
 * 3. 周区间(weekRange):给出该周的日期闭区间;
 * 4. 周加减(addWeeks):周一锚点整周进退;
 * 5. 周一校验(isValidWeekStart):校验入参确为周一;
 * 6. 分钟换算(timeToMinutes):re-export,实现收拢在 @/lib/date;
 * 7. 槽起点换算(slotPrefillStart):点击位置换算为 30 分钟槽起点;
 * 8. 日块布局(layoutDayBlocks):单日条目布局为周网格块;
 * 9. 星期键(WeekdayKey):星期标识联合类型;
 * 10. 周内单日(WeekDay):周视图单日结构;
 * 11. 周块(WeekBlock):周网格布局块结构。
 *
 * 其他:
 * 1. 零 IO、零日期库,日期运算全部基于 UTC 毫秒,避免本地时区(夏令时)扰动;
 * 2. 日期语义是字面日期 "YYYY-MM-DD"(单时区假设)。
 */
import {
  formatUtcDate,
  isValidDateString,
  MS_PER_DAY,
  timeToMinutes,
} from "@/lib/date";

import type { CalendarEntryView } from "./queries";

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

/** 作用:由周一锚点给出该周闭区间(周一至周日),作为周度条目查询的入参来源。 */
export function weekRange(weekStart: string): { start: string; end: string } {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return {
    start: weekStart,
    end: formatUtcDate(startMs + 6 * MS_PER_DAY),
  };
}

/** 作用:周一锚点加减 delta 周,跨月跨年由 UTC 毫秒运算兜住。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatUtcDate(startMs + delta * 7 * MS_PER_DAY);
}

/** 作用:严格校验入参为合法 "YYYY-MM-DD" 且确为周一(地址栏 week 参数的格式约束)。 */
export function isValidWeekStart(value: string): value is string {
  if (!isValidDateString(value)) return false;
  return weekStartFor(value) === value;
}

/** "HH:MM" 换算为当日分钟数;实现收拢在 @/lib/date,re-export 保住既有导出面。 */
export { timeToMinutes };

/** 作用:点击位置分钟数换算为所在 30 分钟槽的起点("HH:00" 或 "HH:30",向下取整)。 */
export function slotPrefillStart(minutes: number): string {
  return minutesToHhmm(Math.floor(minutes / 30) * 30);
}

/**
 * 作用:把单日带时间条目布局成周网格块,重叠条目在列内并列均分。
 * 流程:
 * 1. 过滤出带开始时间的条目,换算为分钟区间(无结束时间按 30 分钟计);
 * 2. 按(开始分钟,条目 id)确定性排序,使结果与入参顺序无关;
 * 3. 扫描线切出重叠簇:条目开始时间不早于当前簇最大结束时间即开新簇;
 * 4. 簇内按贪心车道并列:前一块结束不晚于本块开始即复用车道;
 * 5. 块宽度为 100 除以簇大小,横向偏移为车道序乘以宽度。
 */
export function layoutDayBlocks(dayEntries: CalendarEntryView[]): WeekBlock[] {
  type Item = { id: string; start: number; end: number };
  const items: Item[] = dayEntries
    .filter((entry) => entry.startTime !== null)
    .map((entry) => ({
      id: entry.id,
      start: timeToMinutes(entry.startTime as string),
      end:
        entry.endTime === null
          ? timeToMinutes(entry.startTime as string) + 30 // 无结束时间按 30 分钟计
          : timeToMinutes(entry.endTime),
    }))
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  const blocks: WeekBlock[] = [];
  let cluster: Item[] = [];
  let clusterEnd = -1;
  let lanes: number[] = [];

  const flush = (): void => {
    if (cluster.length === 0) return;
    const width = 100 / cluster.length;
    for (const item of cluster) {
      const lane = lanes.findIndex((laneEnd) => laneEnd <= item.start);
      const laneIndex = lane === -1 ? lanes.length : lane;
      if (lane === -1) lanes.push(item.end);
      else lanes[laneIndex] = item.end;
      blocks.push({
        entryId: item.id,
        leftPercent: laneIndex * width,
        widthPercent: width,
        startMinutes: item.start,
        durationMinutes: item.end - item.start,
      });
    }
    cluster = [];
    lanes = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flush();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return blocks;
}

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeekDay = {
  date: string;
  weekdayKey: WeekdayKey;
  isToday: boolean;
};

export type WeekBlock = {
  entryId: string;
  /** 距列左缘的横向偏移与宽度(百分比,同一重叠簇内并列均分)。 */
  leftPercent: number;
  widthPercent: number;
  /** 距 00:00 的分钟偏移与时长(无结束时间的条目按 30 分钟计)。 */
  startMinutes: number;
  durationMinutes: number;
};

const WEEKDAY_KEYS: WeekdayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

/** 作用:分钟数换算为 "HH:MM"(零填充)。 */
function minutesToHhmm(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

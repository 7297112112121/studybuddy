/**
 * 日历域日期数学与条目展示派生工具（纯函数，无框架依赖）：
 * 月网格/周序列构建、时刻换算、重叠色块布局、条目按日分组。
 */
import { formatUtcDate, MS_PER_DAY } from "@/common/date";

import {
  TIME_HHMM_RE,
  isValidDateString,
} from "@/validation/calendar-validators";
import type { CalendarEntryView } from "@/modules/calendar/queries";

/** 构建 6 行 × 7 列月网格，周一为每周首日，含邻月补位格（inMonth 为 false）。 */
export function buildMonthGrid(
  year: number,
  month: number,
  today: string,
): MonthCell[] {
  // 该月 1 日的星期（周日为 0），换算为周一首日的偏移天数
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingBlanks = (firstWeekday + 6) % 7;
  const firstCellMs = Date.UTC(year, month - 1, 1) - leadingBlanks * MS_PER_DAY;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellMs = firstCellMs + i * MS_PER_DAY;
    const cellDate = new Date(cellMs);
    cells.push({
      date: formatUtcDate(cellMs),
      inMonth: cellDate.getUTCMonth() + 1 === month,
      isToday: formatUtcDate(cellMs) === today,
    });
  }
  return cells;
}

export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

/** "HH:MM" 换算为当日分钟数 0–1439（非法输入抛 RangeError，仅内部可信输入）。 */
export function timeToMinutes(time: string): number {
  if (!TIME_HHMM_RE.test(time)) {
    throw new RangeError(`invalid HH:MM time: ${time}`);
  }
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return hour * 60 + minute;
}

/** 分钟数换算为 "HH:MM"（零填充，刻度与实时线标签共用）。 */
export function minutesToHhmm(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

/** 周时间网格几何：30 分钟槽（单日 48 槽）与每分钟列高像素，槽预填、
    色块兜底时长、时刻轴定位与滚动锚定共用同一来源。 */
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
export const PX_PER_MINUTE = 2;

/** 点击位置分钟数换算为所在 30 分钟槽的起点（"HH:00" 或 "HH:30"，向下取整）。 */
export function slotPrefillStart(minutes: number): string {
  return minutesToHhmm(Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES);
}

/** 周视图槽位新建默认时长（分钟）——预填终点 = 起点 + 此值（业务规则：默认 1 小时）。 */
export const CREATE_DEFAULT_DURATION_MINUTES = 60;

/** 槽起点 + 默认时长的预填终点；跨过 24:00 的槽（23:00/23:30）返回空串，回退「有起点无终点」形态。 */
export function slotPrefillEnd(minutes: number): string {
  const endMinutes =
    Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES +
    CREATE_DEFAULT_DURATION_MINUTES;
  return endMinutes < 24 * 60 ? minutesToHhmm(endMinutes) : "";
}

/** 条目时间前缀：双时间「HH:MM–HH:MM」、仅开始「HH:MM」、无时间 null。 */
export function timePrefix(entry: CalendarEntryView): string | null {
  if (entry.startTime === null) return null;
  return entry.endTime === null
    ? entry.startTime
    : `${entry.startTime}–${entry.endTime}`;
}

/** 条目按日期分组（周视图时间网格与月视图网格摘要共用）。 */
export function groupEntriesByDate(
  entries: CalendarEntryView[],
): Map<string, CalendarEntryView[]> {
  const byDate = new Map<string, CalendarEntryView[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) {
      list.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }
  return byDate;
}

/** 把单日带时间条目布局成周网格块，重叠条目在列内并列均分。 */
export function layoutDayBlocks(dayEntries: CalendarEntryView[]): WeekBlock[] {
  type Item = { id: string; start: number; end: number };
  const items: Item[] = dayEntries
    .filter((entry) => entry.startTime !== null)
    .map((entry) => ({
      id: entry.id,
      start: timeToMinutes(entry.startTime as string),
      end:
        entry.endTime === null
          ? timeToMinutes(entry.startTime as string) + SLOT_MINUTES // 无结束时间按单槽时长计
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

export type WeekBlock = {
  entryId: string;
  leftPercent: number;
  widthPercent: number;
  startMinutes: number;
  durationMinutes: number;
};

/** 周内星期键（周一首），周表头列序与 buildWeekDays 产出共用。 */
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 周视图单日展示模型（buildWeekDays 产出，UI 层只读消费）。 */
export type WeekDay = {
  date: string;
  weekdayKey: WeekdayKey;
  isToday: boolean;
};

/** 月份加减，delta 可正可负，自动进退位。 */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 给出日期所在周的周一；date 不是合法 "YYYY-MM-DD" 时抛 RangeError。 */
export function weekStartFor(date: string): string {
  if (!isValidDateString(date)) {
    throw new RangeError(`invalid date: ${date}`);
  }
  const [year, month, day] = date.split("-").map(Number);
  // 该日星期（周日为 0），换算为周一首日的偏移天数（周一为 0）
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = (weekday + 6) % 7;
  return formatUtcDate(Date.UTC(year, month - 1, day) - offset * MS_PER_DAY);
}

/** 由周一锚点给出周内 7 天，列序周一首，并逐日标记是否今天。 */
export function buildWeekDays(weekStart: string, today: string): WeekDay[] {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return WEEKDAY_KEYS.map((weekdayKey, i) => {
    const date = formatUtcDate(startMs + i * MS_PER_DAY);
    return { date, weekdayKey, isToday: date === today };
  });
}

/** 周一锚点加减 delta 周，跨月跨年由 UTC 毫秒运算兜住。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatUtcDate(startMs + delta * 7 * MS_PER_DAY);
}

/** "YYYY-MM-DD" → "M月D日"（去前导零），今日日程标题等短日期文案用。 */
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

/** "YYYY-MM-DD" → 周内星期键（周一首），右栏未安排卡行首展示用。 */
export function weekdayKeyOf(date: string): WeekdayKey {
  const weekday = new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay();
  return WEEKDAY_KEYS[(weekday + 6) % 7];
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

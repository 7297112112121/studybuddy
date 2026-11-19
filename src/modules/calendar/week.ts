/**
 * calendar/week.ts——周视图数学纯函数(AXY-23 design「契约」节)。
 *
 * 与 month.ts 同源约定:零 IO、零日期库,日期运算全部基于 UTC 毫秒,
 * 避免本地时区(DST)扰动;日期语义是字面日期 "YYYY-MM-DD"
 * (单时区假设,AXY-22 design 开放问题 #2 沿承)。
 */
import {
  formatUtcDate,
  isValidDateString,
  MS_PER_DAY,
  timeToMinutes,
} from "@/lib/date";

import type { CalendarEntryView } from "./queries";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeekDay = {
  date: string;
  weekdayKey: WeekdayKey;
  isToday: boolean;
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

/** date("YYYY-MM-DD") → 该日所在周的周一("YYYY-MM-DD",周一恒等)。 */
export function weekStartFor(date: string): string {
  if (!isValidDateString(date)) {
    throw new RangeError(`invalid date: ${date}`);
  }
  const [y, m, d] = date.split("-").map(Number);
  // getUTCDay:周日=0;换算为周一首日的偏移天数(周一=0 .. 周日=6)。
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const offset = (dow + 6) % 7;
  return formatUtcDate(Date.UTC(y, m - 1, d) - offset * MS_PER_DAY);
}

/** 周一锚点 → 周内 7 天(列序周一首,weekdayKey 依列序;isToday 对照 today)。 */
export function buildWeekDays(weekStart: string, today: string): WeekDay[] {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return WEEKDAY_KEYS.map((weekdayKey, i) => {
    const date = formatUtcDate(startMs + i * MS_PER_DAY);
    return { date, weekdayKey, isToday: date === today };
  });
}

/** 周一锚点 → 该周闭区间(周一..周日,"YYYY-MM-DD"),listWeekEntries 入参来源。 */
export function weekRange(weekStart: string): { start: string; end: string } {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return {
    start: weekStart,
    end: formatUtcDate(startMs + 6 * MS_PER_DAY),
  };
}

/** 周一锚点 ± delta 周(跨月/跨年由 UTC 毫秒运算兜住)。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatUtcDate(startMs + delta * 7 * MS_PER_DAY);
}

/** 严格校验:合法 "YYYY-MM-DD" 且确为周一(?week= wire 格式约束)。 */
export function isValidWeekStart(value: string): value is string {
  if (!isValidDateString(value)) return false;
  return weekStartFor(value) === value;
}

/** "HH:MM" → 当日分钟数 0–1439：实现收拢在 @/lib/date，re-export 保住既有导出面。 */
export { timeToMinutes };

/** 分钟数 → "HH:MM"(零填充)。 */
function minutesToHhmm(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 点击位置分钟数 → 所在 30 分钟槽起点 "HH:00"/"HH:30"(向下取整,F-05)。 */
export function slotPrefillStart(minutes: number): string {
  return minutesToHhmm(Math.floor(minutes / 30) * 30);
}

export type WeekBlock = {
  entryId: string;
  /** 列内横向偏移与宽度(百分比;同一重叠簇内并列均分,proposal 边界 #2)。 */
  leftPercent: number;
  widthPercent: number;
  /** 距 00:00 分钟偏移与时长(时间点条目 durationMinutes 固定 30,D-12)。 */
  startMinutes: number;
  durationMinutes: number;
};

/**
 * 单日带时间条目 → 网格布局块。
 * 重叠簇 = 区间图连通分量(扫描线:按开始时间排序,开始 ≥ 当前簇最大结束
 * 即开新簇);簇内按贪心车道(前块结束 ≤ 本块开始即复用车道)并列,
 * 宽度 = 100 / 簇大小,leftPercent = 车道序 × 宽度。入参顺序无关:
 * 先按 (startMinutes, entryId) 确定性排序再计算。
 */
export function layoutDayBlocks(dayEntries: CalendarEntryView[]): WeekBlock[] {
  type Item = { id: string; start: number; end: number };
  const items: Item[] = dayEntries
    .filter((e) => e.startTime !== null)
    .map((e) => ({
      id: e.id,
      start: timeToMinutes(e.startTime as string),
      end:
        e.endTime === null
          ? timeToMinutes(e.startTime as string) + 30 // D-12:时间点条目 30 分钟
          : timeToMinutes(e.endTime),
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

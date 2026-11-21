/**
 * 文件作用:日历客户端组件的展示推导纯函数与客户端消费类型(仅客户端消费)。
 *
 */
import { formatUtcDate, MS_PER_DAY } from "@/lib/date";

import { TIME_HHMM_RE } from "./validators";
import type { CalendarEntryView } from "./queries";

/** 作用:构建 6 行 × 7 列月网格,周一为每周首日,含邻月补位格(inMonth 为 false)。 */
export function buildMonthGrid(
  year: number,
  month: number,
  today: string,
): MonthCell[] {
  // 该月 1 日的星期(周日为 0),换算为周一首日的偏移天数
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

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeekDay = {
  date: string;
  weekdayKey: WeekdayKey;
  isToday: boolean;
};

/** 作用:"HH:MM" 换算为当日分钟数 0–1439(非法输入抛 RangeError,仅内部可信输入)。 */
export function timeToMinutes(time: string): number {
  if (!TIME_HHMM_RE.test(time)) {
    throw new RangeError(`invalid HH:MM time: ${time}`);
  }
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/** 作用:点击位置分钟数换算为所在 30 分钟槽的起点("HH:00" 或 "HH:30",向下取整)。 */
export function slotPrefillStart(minutes: number): string {
  return minutesToHhmm(Math.floor(minutes / 30) * 30);
}

/**
 * 作用:把单日带时间条目布局成周网格块,重叠条目在列内并列均分。
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

export type WeekBlock = {
  entryId: string;
  leftPercent: number;
  widthPercent: number;
  startMinutes: number;
  durationMinutes: number;
};

/** 作用:分钟数换算为 "HH:MM"(零填充)。 */
function minutesToHhmm(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

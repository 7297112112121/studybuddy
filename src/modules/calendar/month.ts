/**
 * 文件作用:日历月视图的日期数学纯函数。
 *
 * 成员:
 * 1. 月网格构建(buildMonthGrid):生成 6 行 × 7 列月网格,周一首日,含邻月补位;
 * 2. 月区间(monthRange):给出该月的日期闭区间;
 * 3. 月份加减(addMonths):月份进退位换算;
 * 4. 日期严格校验(isValidDateString):re-export,实现收拢在 @/lib/date;
 * 5. 时刻截短(formatHhmm):re-export,实现收拢在 @/lib/date;
 * 6. 月网格单元(MonthCell):月网格单格的日期与标记类型。
 *
 * 其他:
 * 1. 零 IO、零日期库,日期运算全部基于 UTC 毫秒,避免本地时区(夏令时)扰动;
 * 2. 日期语义是字面日期 "YYYY-MM-DD"(单时区假设),经本地时间换算会引入漂移;
 * 3. month 入参为 1~12(产品口径),不是 JS Date 的 0~11。
 */
import { daysInMonth, formatUtcDate, MS_PER_DAY } from "@/lib/date";

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

/** 作用:月份加减,delta 可正可负,自动进退位。 */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 严格校验 "YYYY-MM-DD";实现收拢在 @/lib/date,re-export 保住既有导出面。 */
export { isValidDateString } from "@/lib/date";

/** "HH:MM:SS" 截短为 "HH:MM";实现收拢在 @/lib/date,re-export 保住既有导出面。 */
export { formatHhmm } from "@/lib/date";

export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

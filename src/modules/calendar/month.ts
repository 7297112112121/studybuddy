/**
 * calendar/month.ts——日历数学纯函数（AXY-22 design「契约」节）。
 *
 * 零 IO、零日期库：日期运算全部基于 UTC 毫秒与手工 days-in-month 表，
 * 避免本地时区（DST）扰动；entryDate 语义是字面日期 "YYYY-MM-DD"
 * （单时区假设，design 开放问题 #2），任何一处经本地时间换算都会引入漂移。
 *
 * 约定：month 入参 1–12（产品口径），非 JS Date 的 0–11。
 */

export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

const MS_PER_DAY = 86_400_000;

/** 平闰年该月天数（m 为 1–12）。 */
function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
}

/** UTC 时间戳 → "YYYY-MM-DD"（零填充）。 */
function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 6 行 × 7 列月网格，周一为每周首日；含邻月补位格（inMonth=false）。 */
export function buildMonthGrid(
  year: number,
  month: number,
  today: string,
): MonthCell[] {
  // 该月 1 日的星期（getUTCDay：周日=0），换算为周一首日的偏移天数。
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingBlanks = (firstDow + 6) % 7;
  const firstCellMs = Date.UTC(year, month - 1, 1) - leadingBlanks * MS_PER_DAY;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const ms = firstCellMs + i * MS_PER_DAY;
    const d = new Date(ms);
    cells.push({
      date: formatDate(ms),
      inMonth: d.getUTCMonth() + 1 === month,
      isToday: formatDate(ms) === today,
    });
  }
  return cells;
}

/** 该月日期闭区间 "YYYY-MM-DD"（listMonthEntries 查询入参的单一来源）。 */
export function monthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`,
  };
}

/** 月份加减，month 1–12，自动进退位。 */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 严格校验 "YYYY-MM-DD"：格式合法且为真实存在的日历日（拒收 2026-02-30）。 */
export function isValidDateString(value: string): value is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

/** "HH:MM:SS" → "HH:MM"（time 列查询结果归一）。 */
export function formatHhmm(time: string): string {
  return time.slice(0, 5);
}

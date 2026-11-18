/**
 * calendar/week.ts——周视图数学纯函数(AXY-23 design「契约」节)。
 *
 * 与 month.ts 同源约定:零 IO、零日期库,日期运算全部基于 UTC 毫秒,
 * 避免本地时区(DST)扰动;日期语义是字面日期 "YYYY-MM-DD"
 * (单时区假设,AXY-22 design 开放问题 #2 沿承)。
 */

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeekDay = { date: string; weekdayKey: WeekdayKey; isToday: boolean };

const MS_PER_DAY = 86_400_000;

const WEEKDAY_KEYS: WeekdayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

/** 平闰年该月天数(m 为 1–12;与 month.ts 同表,不导出重复实现)。 */
function daysInMonthOf(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
}

/** 严格校验 "YYYY-MM-DD" 格式且为真实日历日(复用 month.ts 的判定)。 */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonthOf(y, m);
}

/** UTC 毫秒 → "YYYY-MM-DD"(零填充;与 month.ts formatDate 同实现)。 */
function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** date("YYYY-MM-DD") → 该日所在周的周一("YYYY-MM-DD",周一恒等)。 */
export function weekStartFor(date: string): string {
  if (!isValidDate(date)) {
    throw new RangeError(`invalid date: ${date}`);
  }
  const [y, m, d] = date.split("-").map(Number);
  // getUTCDay:周日=0;换算为周一首日的偏移天数(周一=0 .. 周日=6)。
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const offset = (dow + 6) % 7;
  return formatDate(Date.UTC(y, m - 1, d) - offset * MS_PER_DAY);
}

/** 周一锚点 → 周内 7 天(列序周一首,weekdayKey 依列序;isToday 对照 today)。 */
export function buildWeekDays(weekStart: string, today: string): WeekDay[] {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return WEEKDAY_KEYS.map((weekdayKey, i) => {
    const date = formatDate(startMs + i * MS_PER_DAY);
    return { date, weekdayKey, isToday: date === today };
  });
}

/** 周一锚点 → 该周闭区间(周一..周日,"YYYY-MM-DD"),listWeekEntries 入参来源。 */
export function weekRange(weekStart: string): { start: string; end: string } {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return {
    start: weekStart,
    end: formatDate(startMs + 6 * MS_PER_DAY),
  };
}

/** 周一锚点 ± delta 周(跨月/跨年由 UTC 毫秒运算兜住)。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatDate(startMs + delta * 7 * MS_PER_DAY);
}

/** 严格校验:合法 "YYYY-MM-DD" 且确为周一(?week= wire 格式约束)。 */
export function isValidWeekStart(value: string): value is string {
  if (!isValidDate(value)) return false;
  return weekStartFor(value) === value;
}

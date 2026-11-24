/**
 * 文件作用:日历视图导航日期数学——纯 UTC 运算,零 DB/服务端依赖,客户端可用。
 *
 * 自 service.ts 迁出(数据流向评审裁决 4:日期数学迁出写路径 service,
 * 消除逻辑层反向依赖展示层);现居 features:当前引用者全为前端组件
 * (CalendarPageClient/WeekView),写路径 service 已无依赖。校验规则
 * 仍以 modules validators 为单一来源。
 */
import { formatUtcDate, MS_PER_DAY } from "@/common/date";

import { isValidDateString } from "@/modules/calendar/validators";

/** 作用:周内星期键(周一首),周表头列序与 buildWeekDays 产出共用。 */
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** 作用:周视图单日展示模型(buildWeekDays 产出,UI 层只读消费)。 */
export type WeekDay = {
  date: string;
  weekdayKey: WeekdayKey;
  isToday: boolean;
};

/** 作用:月份加减,delta 可正可负,自动进退位。 */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

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

/** 作用:周一锚点加减 delta 周,跨月跨年由 UTC 毫秒运算兜住。 */
export function addWeeks(weekStart: string, delta: number): string {
  const startMs = Date.parse(`${weekStart}T00:00:00Z`);
  return formatUtcDate(startMs + delta * 7 * MS_PER_DAY);
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

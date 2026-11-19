/**
 * src/lib/date.ts——无业务日期工具函数。
 *
 * 约定（calendar/month.ts 同源沿用）：日期一律是字面日期 "YYYY-MM-DD" 字符串
 * （单时区假设，calendar_entry date mode:'string' 同口径），零日期库；
 * 区间/格式化运算基于 UTC 毫秒，避免本地时区（DST）扰动。month 入参 1–12（产品口径）。
 */

/** 服务端本地时区的今日字面日期 "YYYY-MM-DD"。 */
export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" 闭区间内天数（含首尾）。 */
export function rangeDayCount(rangeStart: string, rangeEnd: string): number {
  const startMs = Date.parse(`${rangeStart}T00:00:00Z`);
  const endMs = Date.parse(`${rangeEnd}T00:00:00Z`);
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

/** 平闰年该月天数（month 为 1–12）。 */
export function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
}

/** UTC 时间戳 → "YYYY-MM-DD"（零填充）。 */
export function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 严格校验 "YYYY-MM-DD"：格式合法且为真实存在的日历日（拒收 2026-02-30）。 */
export function isValidDateString(value: string): value is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

/**
 * 日历域校验规则单一真源:时刻格式、日期/周一/年月严格判定与年月 wire
 * 解析/序列化;wire 契约(schema 与出入参类型)落统一接口路由目录
 * src/app/api/calendar 的 request/response。
 * 日期语义是字面日期 "YYYY-MM-DD"(单时区假设),时刻一律 "HH:MM";
 * month 入参为 1~12(产品口径),不是 JS Date 的 0~11。
 */
import { daysInMonth } from "@/common/date";

/** "HH:MM" 分钟粒度格式(时刻契约单一来源:schema 校验与 timeToMinutes 共用)。 */
export const TIME_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 严格校验 "YYYY-MM-DD":格式合法且为真实存在的日历日(拒收 2026-02-30)。 */
export function isValidDateString(value: string): value is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

/** 严格校验入参为合法 "YYYY-MM-DD" 且确为周一(地址栏 week 参数的格式约束)。 */
export function isValidWeekStart(value: string): value is string {
  if (!isValidDateString(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // 该日星期(周日为 0),周一为 1;不经 service 的周锚点工具(weekStartFor)判定以免校验层↔service 成环
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1;
}

/** 严格校验年月读参数:year 为 1~9999、month 为 1~12 且均为整数(月度查询入参约束)。 */
export function isValidYearMonth(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12
  );
}

/** 解析 "YYYY-MM" wire 格式:格式合法且为真实年月才返回数字对,否则 null。 */
export function parseYearMonth(
  raw: string | undefined,
): { year: number; month: number } | null {
  if (raw === undefined || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const [year, month] = raw.split("-").map(Number);
  if (!isValidYearMonth(year, month)) return null;
  return { year, month };
}

/** year/month → "YYYY-MM"(wire 序列化,月份零填充)。 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

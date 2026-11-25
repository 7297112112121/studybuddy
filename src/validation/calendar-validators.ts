/**
 * 日历域的校验规则单一真源(消费方引用不复写):
 * 覆盖时刻格式、日期/周一/年月严格校验、年月 wire 解析与序列化、条目写端点入参
 * schema(calendarEntryInputSchema)与条目集合读端点查询参数 schema。
 * 日期语义是字面日期 "YYYY-MM-DD"(单时区假设),时刻一律 "HH:MM";
 * month 入参为 1~12(产品口径),不是 JS Date 的 0~11。
 */
import { daysInMonth } from "@/common/date";
import { z } from "zod";

/** "HH:MM" 分钟粒度格式(时刻契约单一来源:schema 校验与 timeToMinutes 共用)。 */
export const TIME_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 严格校验 "YYYY-MM-DD":格式合法且为真实存在的日历日(拒收 2026-02-30)。 */
export function isValidDateString(value: string): value is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

/** 严格校验入参为合法 "YYYY-MM-DD" 且确为周一(地址栏 week 参数的格式约束)。 */
export function isValidWeekStart(value: string): value is string {
  if (!isValidDateString(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // 该日星期(周日为 0),周一为 1;不经 weekStartFor 判定以免 validators↔service 成环
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
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

/** 作用:条目新增/编辑入参的结构与字段规则;message 直接承载 i18n key。 */
export const calendarEntryInputSchema = z
  .object({
    date: z
      .string()
      .refine(isValidDateString, { message: "calendar.error.invalidDate" }), // 日期必须为合法 "YYYY-MM-DD"
    title: z
      .string()
      .min(1, { message: "calendar.error.titleRequired" }) // 标题必填
      .max(50, { message: "calendar.error.titleTooLong" }), // 上限 50 字(UI 已被 maxLength=50 挡住,此处后端兜底)
    content: z
      .string()
      .max(2000, { message: "calendar.error.contentTooLong" })
      .nullable(), // 具体内容,纯文本不做格式化;上限 2000 字(UI 已被 maxLength=2000 挡住,此处后端兜底)
    startTime: z
      .string()
      .regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" })
      .nullable(), // 时间为 "HH:MM" 或 null
    endTime: z
      .string()
      .regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" })
      .nullable(), // 时间为 "HH:MM" 或 null
  })
  // 开始留空时结束不得有值(服务端半边;UI 半边是控件禁用)
  .refine((value) => value.endTime === null || value.startTime !== null, {
    path: ["endTime"],
    message: "calendar.error.endTimeAfterStart",
  })
  // 结束须晚于开始;零填充 "HH:MM" 字符串比较即时间比较
  .refine(
    (value) =>
      value.startTime === null ||
      value.endTime === null ||
      value.endTime > value.startTime,
    {
      path: ["endTime"],
      message: "calendar.error.endTimeAfterStart",
    },
  );

export type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>;

/** 条目集合查询参数契约:周锚点(week)或月度(view=month&month),读端点入参单一来源。 */
export const calendarEntriesQuerySchema = z.union([
  z.object({ week: z.string().refine(isValidWeekStart) }),
  z.object({
    view: z.literal("month"),
    month: z
      .string()
      .refine((value) => parseYearMonth(value) !== null)
      .transform((value) => parseYearMonth(value)!),
  }),
]);

export type CalendarEntriesQuery = z.infer<typeof calendarEntriesQuerySchema>;

/** 字段级错误:键随条目入参 schema 字段推导,值为 i18n messageKey(前端渲染错误文案的唯一来源)。 */
export type CalendarFieldErrors = Partial<
  Record<keyof CalendarEntryInput, string>
>;

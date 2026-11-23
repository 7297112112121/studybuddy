/**
 * 文件作用:日历域的校验规则单一真源(auth 先例,消费方引用不复写)。
 *
 * 成员:
 * 1. 时刻格式正则(TIME_HHMM_RE):"HH:MM" 分钟粒度契约;
 * 2. 日期严格校验(isValidDateString):格式合法且为真实存在的日历日;
 * 3. 周一校验(isValidWeekStart):校验入参为合法日期且确为周一;
 * 4. 条目入参 schema(calendarEntryInputSchema):新增/编辑入参的结构与字段规则;
 * 5. 条目入参类型(CalendarEntryInput);
 * 6. 字段级错误类型(CalendarFieldErrors):前端渲染错误文案的唯一来源;
 * 7. 读入参校验(isValidYearMonth / isValidEntryId):月度查询年月与条目 id 的读路径入参约束。
 *
 * 其他:
 * 1. 日期语义是字面日期 "YYYY-MM-DD"(单时区假设),时刻一律 "HH:MM";
 * 2. month 入参为 1~12(产品口径),不是 JS Date 的 0~11。
 */
import { daysInMonth } from "@/lib/date";
import { z } from "zod";

/** "HH:MM" 分钟粒度格式(时刻契约单一来源:schema 校验与 timeToMinutes 共用)。 */
export const TIME_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 条目 id 合法域:uuid 主键的形状约束(读路径 readEntry 入参约束)。 */
const ENTRY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** 严格校验条目 id 为 uuid 形状(readEntry 入参约束)。 */
export function isValidEntryId(value: string): boolean {
  return ENTRY_ID_RE.test(value);
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

/** 字段级错误:键为字段,值为 i18n messageKey(前端渲染错误文案的唯一来源)。 */
export type CalendarFieldErrors = Partial<
  Record<"date" | "title" | "content" | "startTime" | "endTime", string>
>;

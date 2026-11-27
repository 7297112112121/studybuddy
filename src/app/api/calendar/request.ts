/**
 * 日历域请求(入参)wire 契约单一真源:条目写端点入参 schema
 * (calendarEntryInputSchema)与条目集合读端点查询参数 schema;校验规则与
 * wire 判定函数在 src/validation/calendar,响应(出参)契约在同目录 response。
 * message 直接承载 i18n key。
 */
import { z } from "zod";

import {
  isValidDateString,
  isValidWeekStart,
  parseYearMonth,
  TIME_HHMM_RE,
} from "@/validation/calendar";

/** 条目新增/编辑入参的结构与字段规则;message 直接承载 i18n key。 */
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

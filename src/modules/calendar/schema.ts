/**
 * 文件作用:日历域的 drizzle 表定义与条目入参 zod 契约。
 *
 * 成员:
 * 1. 条目表(calendarEntry):日历条目单表,创建即存在、删除即消失;
 * 2. 时间正则(TIME_HHMM_RE):"HH:MM" 分钟粒度校验;
 * 3. 资料表(entryResource):条目附属资料单表,随确认写入落库、随条目删除而消失;
 * 4. 条目入参 schema(calendarEntryInputSchema):条目新增/编辑的结构与字段规则;
 * 5. 条目入参类型(CalendarEntryInput):入参 schema 的推断类型;
 * 6. 字段级错误类型(CalendarFieldErrors):键为字段、值为错误 key。
 *
 * 其他:
 * 1. 列属性名 camelCase,DB 列名经 snake_case 在表定义时烘焙
 *    (drizzle-orm 1.0 RC 行为,禁止运行时 casing 选项);
 * 2. 不建跨模块 DB 级 FK:user 归属 auth 模块,经 db barrel 引用会构成
 *    自引用循环,账号隔离由应用层 user_id 过滤保证;
 * 3. zod 契约与表定义同文件:校验单一来源,前后端共用;
 * 4. 校验 message 直接承载 i18n key,action 只返回错误 key 不返回文案原文;
 * 5. src/db/schema.ts barrel re-export 本模块全部产物。
 */
import {
  date,
  index,
  snakeCase,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { TIME_HHMM_RE } from "@/lib/date";
import { isValidDateString } from "./month";

const pgTable = snakeCase.table;

/**
 * 作用:日历条目单表,唯一实体,无状态字段——创建即存在、删除即消失。
 * 1. entryDate 为字面日期 "YYYY-MM-DD"(date mode:'string',无时区换算);
 * 2. startTime/endTime 为 "HH:MM" 分钟粒度(存储兼容 "HH:MM:SS",查询层归一)。
 */
export const calendarEntry = pgTable(
  "calendar_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    entryDate: date({ mode: "string" }).notNull(),
    title: text().notNull(),
    startTime: time(), // 1.0 RC:列默认可空,无 .nullable() 链
    endTime: time(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calendar_entry_user_date").on(t.userId, t.entryDate)],
);

/** "HH:MM" 分钟粒度正则:真源在 @/lib/date,re-export 保住模块内既有导出面。 */
export { TIME_HHMM_RE };

/**
 * 作用:条目附属资料单表,唯一状态「已留存」——随确认写入落库、随条目删除而消失。
 * 1. entryId 为同模块引用,建 DB 级 FK + ON DELETE CASCADE
 *    (不建 FK 的裁决仅针对跨模块 auth 引用);
 * 2. 账号隔离由条目 user_id 归属传导,读取路径一律经条目归属过滤。
 */
export const entryResource = pgTable(
  "entry_resource",
  {
    id: uuid().primaryKey().defaultRandom(),
    entryId: uuid()
      .notNull()
      .references(() => calendarEntry.id, { onDelete: "cascade" }),
    title: text().notNull(),
    url: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entry_resource_entry_id").on(t.entryId)],
);

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
  Record<"date" | "title" | "startTime" | "endTime", string>
>;

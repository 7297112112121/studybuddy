/**
 * 日历域 drizzle 表定义 + 条目入参 zod 契约（AXY-22 design「数据模型」「契约」节）。
 *
 * 与 auth 先例一致：模块属主文件；`src/db/schema.ts` barrel re-export 全部产物。
 * 列属性名 camelCase，DB 列名经 `snakeCase.table` 烘焙（drizzle-orm 1.0 RC
 * 将 casing 从运行时 client 选项改为表定义时烘焙，禁止运行时 casing 选项）。
 *
 * 不建 DB 级 FK：userId 归属 Better Auth user.id，跨模块引用须经
 * `src/db/schema.ts` barrel（构成 barrel 自引用循环，design 裁决），
 * 且产品无删除账号流程；账号隔离由应用层 user_id 过滤保证（R7）。
 *
 * zod 契约与表定义同文件（校验单一来源，前后端共用，不设 validators.ts）：
 * message 直接承载 i18n key（ADR-0010），action 只返回错误 key 不返回文案原文。
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
 * calendar_entry 单表（唯一实体，无状态字段：创建即存在、删除即消失）。
 * entryDate 为字面日期 "YYYY-MM-DD"（date mode:'string'，无时区换算）；
 * startTime/endTime 为 "HH:MM" 分钟粒度（存储兼容 "HH:MM:SS"，查询层归一）。
 */
export const calendarEntry = pgTable(
  "calendar_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    entryDate: date({ mode: "string" }).notNull(),
    title: text().notNull(),
    startTime: time(), // 1.0 RC：列默认可空，无 .nullable() 链
    endTime: time(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calendar_entry_user_date").on(t.userId, t.entryDate)],
);

/** "HH:MM" 分钟粒度：真源在 @/lib/date，re-export 保住模块内既有导出面。 */
export { TIME_HHMM_RE };

/**
 * entry_resource 单表(AXY-24:条目附属资料,唯一状态「已留存」——
 * 随确认写入落库、随条目删除而消失)。entryId 为同模块引用,建 DB 级
 * FK + ON DELETE CASCADE(AXY-22 不建 FK 的裁决仅针对跨模块 auth 引用);
 * 账号隔离由条目 user_id 归属传导,读取路径一律经条目归属过滤(R11)。
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

export const calendarEntryInputSchema = z
  .object({
    date: z
      .string()
      .refine(isValidDateString, { message: "calendar.error.invalidDate" }), // F-04
    title: z
      .string()
      .min(1, { message: "calendar.error.titleRequired" }) // E-01
      .max(50, { message: "calendar.error.titleTooLong" }), // F-01 后端兜底（UI 已被 maxLength=50 挡住）
    startTime: z
      .string()
      .regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" })
      .nullable(), // F-02
    endTime: z
      .string()
      .regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" })
      .nullable(), // F-03
  })
  // F-03：开始留空时结束不得有值（服务端半边；UI 半边是控件禁用）
  .refine((v) => v.endTime === null || v.startTime !== null, {
    path: ["endTime"],
    message: "calendar.error.endTimeAfterStart",
  })
  // F-03/E-03：结束须晚于开始；零填充 HH:MM 字符串比较即时间比较
  .refine(
    (v) =>
      v.startTime === null || v.endTime === null || v.endTime > v.startTime,
    {
      path: ["endTime"],
      message: "calendar.error.endTimeAfterStart",
    },
  );

export type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>;

/** 字段级错误：键为字段，值为 i18n messageKey（前端渲染 E 文案的唯一来源）。 */
export type CalendarFieldErrors = Partial<
  Record<"date" | "title" | "startTime" | "endTime", string>
>;

/**
 * 文件作用:日历域的 drizzle 表定义;入参与载荷的 zod 契约在 validators.ts(校验单一真源)。
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

const pgTable = snakeCase.table;

/**
 * 作用:日历条目单表,唯一实体,无状态字段——创建即存在、删除即消失。
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

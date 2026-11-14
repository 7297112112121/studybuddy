/**
 * 认证域 drizzle 表定义 + 注册入参 zod 契约（design「数据模型」节）。
 *
 * 放置约定（本设计立样板）：模块属主文件；`src/db/schema.ts` 为公共契约 barrel
 * re-export 此处全部产物。列属性名使用 Better Auth 字段名（camelCase），
 * DB 列名经 `snakeCase.table`（drizzle-orm 1.0 RC 将 casing 从运行时 client
 * 选项改为表定义时烘焙）转换为 snake_case。唯一索引显式命名
 * `user_phone_number`：后续 service 层以 23505 错误码判定手机号冲突时
 * 依赖该稳定名称（R14）。
 */
import {
  boolean,
  snakeCase,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { PASSWORD_RE, PHONE_RE } from "./validators";

const pgTable = snakeCase.table;

/**
 * user 表。email 为 Better Auth 核心必填列，本产品无邮箱账号，
 * 存确定性占位邮箱（`phoneToPlaceholderEmail`，Task 4 service 产出），UI 永不展示。
 * agreementVersion/agreedAt 对应 R15 协议同意留痕。
 */
export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    phoneNumber: text().notNull(),
    phoneNumberVerified: boolean().notNull().default(false),
    agreementVersion: text().notNull(),
    agreedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_phone_number").on(t.phoneNumber)],
);

/**
 * account 表。credential 记录持密码 scrypt 摘要（R13：永不存明文）；
 * access_token 等列仅 OAuth 场景使用，本期恒空。
 */
export const account = pgTable("account", {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  password: text(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  tokenType: text(),
  scope: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** session 表。token 同名为 Redis 键（secondaryStorage 双写，ADR-0013）。 */
export const session = pgTable("session", {
  id: text().primaryKey(),
  token: text().notNull().unique(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** verification 表。OTP 通道就绪前为空表，结构齐备（design「数据模型」节）。 */
export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * 注册入参校验（边界 #1 后端半边，design 代码原样）。
 * PHONE_RE/PASSWORD_RE 为全仓单一来源（Task 2 validators）。
 */
export const registerInputSchema = z
  .object({
    phone: z.string().regex(PHONE_RE),
    password: z.string().regex(PASSWORD_RE),
    confirmPassword: z.string(),
    agreementAccepted: z.literal(true),
  })
  .refine((v) => v.password === v.confirmPassword);

export type RegisterInput = z.infer<typeof registerInputSchema>;

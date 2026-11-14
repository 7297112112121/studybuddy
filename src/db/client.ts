/**
 * drizzle 客户端单例（design「数据模型」节放置约定）。
 *
 * 无 .env 构建守卫：DATABASE_URL 缺失时回退本地连接串，模块作用域
 * 不抛错、不发起连接——postgres-js 为惰性连接，首条查询才真正建链。
 *
 * drizzle-orm 1.0 RC 变更：client 构造的 `schema`/`casing` 运行时选项均已移除——
 * snake_case 列名在 `src/modules/auth/schema.ts` 经 `snakeCase.table` 于表定义时
 * 烘焙；关系查询改由 `defineRelations` 产出 relational config 经 `relations`
 * 传入。表清单从公共契约 barrel 取（仅挑表实体，zod 契约不进 client）。
 */
import { defineRelations } from "drizzle-orm";
import {
  drizzle,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const tables = {
  user: schema.user,
  account: schema.account,
  session: schema.session,
  verification: schema.verification,
};

export const authRelations = defineRelations(tables);

export const db: PostgresJsDatabase<typeof authRelations> = drizzle({
  client: postgres(
    process.env.DATABASE_URL ?? "postgresql://localhost:5432/studybuddy",
  ),
  relations: authRelations,
});

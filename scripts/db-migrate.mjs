/**
 * 容器内数据库迁移执行件(compose 服务 migrate,一次性运行):
 *   docker compose --profile tools run --rm migrate
 * 与本地 npm run db:migrate / CI 同走 drizzle-orm 官方 migrator,
 * 记账表 drizzle.__drizzle_migrations 完全一致——服务器与本地迁移状态可互认。
 *
 * 镜像内自洽性(见 Dockerfile runner 阶段):drizzle-orm 与 postgres 两包
 * 均零运行时依赖,从构建层整包带入;standalone 追踪只含应用导入的文件,
 * 不保证 migrator 子路径存在,故需显式拷贝。
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 未设置——应经服务器本地 .env 注入(ADR-0022)");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle({ client }), { migrationsFolder: "./src/db/migrations" });
  console.log("数据库迁移完成");
} finally {
  await client.end();
}

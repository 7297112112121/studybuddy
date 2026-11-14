/**
 * 集成测试 globalSetup：以 drizzle migrator 应用 src/db/migrations（Task 5）。
 *
 * 说明：`test.env` 不作用于 globalSetup（其在 env 注入前执行），故此处
 * DATABASE_URL 的兜底值与 vitest.config.integration.ts 保持一致。
 * migrate 路径以本文件位置锚定（相对 cwd 易受启动目录影响）。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/db/migrations",
);

export default async function globalSetup(): Promise<void> {
  const client = postgres(
    process.env.DATABASE_URL ??
      "postgresql://studybuddy:studybuddy@localhost:5432/studybuddy",
    {
      max: 1,
      // 幂等迁移的 NOTICE（如 schema "drizzle" already exists）不进测试输出
      onnotice: () => {},
    },
  );
  try {
    // drizzle-orm 1.0 RC：drizzle() 仅接受配置对象形态（drizzle({ client })），
    // 旧的 drizzle(client) 位置参数形态被静默忽略——内部自建无凭据连接
    // （默认取 OS 用户名），最终 28P01 认证失败。
    const db = drizzle({ client });
    const result = await migrate(db, { migrationsFolder });
    // drizzle-orm 1.0 RC：migrate 失败可能以返回值而非 throw 表达
    if (result && "exitCode" in result) {
      throw new Error(`migrate 失败：${result.exitCode}`);
    }
  } finally {
    await client.end();
  }
}

import { defineConfig } from "drizzle-kit";

// drizzle-orm 1.0 RC：snake_case 列名已在表定义处经 snakeCase.table 烘焙，
// drizzle-kit 直接按烘焙后的列名生成迁移，无需（也不再支持）config.casing。
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/studybuddy",
  },
});

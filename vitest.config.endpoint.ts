import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest 接口测试配置（端点直调 + 落库断言）。
 *
 * 与单测（vitest.config.ts）分轨：
 * - 真实 Postgres（compose.dev.yaml）——globalSetup 经 drizzle migrator 应用
 *   src/db/migrations，跑测试前先 `npm run dev:infra`；
 * - environment 为 node（无 DOM 需求），复用 vite-tsconfig-paths 共享 `@/*` 别名；
 * - env 兜底值与 .env.example / compose.dev.yaml 凭据一致，CI 无 .env 上下文时
 *   仍可直连本地 compose 基础设施；`npm test`（单测轨）exclude 了
 *   tests/endpoint/** 与 tests/migrations/**（迁移查证同需真实 PG）。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/endpoint/**/*.test.ts", "tests/migrations/**/*.test.ts"],
    globalSetup: ["tests/endpoint/global-setup.ts"],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://studybuddy:studybuddy@localhost:5432/studybuddy",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      // better-auth 1.7 在无 secret 时 betterAuth() 直接抛错，端点直调测试
      // 需在此注入测试值兜底（缺失时 CI/本地无 .env 上下文仍可跑）
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        "integration-test-secret-0123456789abcdef",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    },
  },
});

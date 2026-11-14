import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest 集成测试配置（Task 5，design「契约总表」service 行）。
 *
 * 与单测（vitest.config.ts）分轨：
 * - 真实 Postgres（compose.dev.yaml）——globalSetup 经 drizzle migrator 应用
 *   src/db/migrations，跑测试前先 `npm run dev:infra`；
 * - environment 为 node（无 DOM 需求），复用 vite-tsconfig-paths 共享 `@/*` 别名；
 * - env 兜底值与 .env.example / compose.dev.yaml 凭据一致，CI 无 .env 上下文时
 *   仍可直连本地 compose 基础设施（Task 13 才把集成测试接入 CI 服务容器，
 *   故 `npm test`（单测轨）exclude 了 tests/integration/**）。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://studybuddy:studybuddy@localhost:5432/studybuddy",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    },
  },
});

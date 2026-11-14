import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest 单测配置（ADR-0012）。
 *
 * - 按 Next.js 16.4.6 官方测试指南（node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md）
 *   组合 @vitejs/plugin-react + jsdom + vite-tsconfig-paths；
 * - vite-tsconfig-paths 复用 tsconfig 的 `@/*` 别名，应用与测试共享一套解析；
 * - 不开 globals：测试文件显式 `import { describe, it, expect } from "vitest"`，
 *   免去为全局注入单独维护 ESLint 配置；
 * - include 锁定 tests/**：Playwright 的 e2e/*.spec.ts 同样命中 vitest 默认
 *   include 模式，不显式收窄会把 E2E 文件误当单测跑；
 * - exclude 掉 tests/integration/**：集成测试走 vitest.config.integration.ts
 *   分轨（真实 PG，Task 5）——CI 无数据库服务上下文，`npm test` 不得触达。
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/integration/**", "**/node_modules/**"],
  },
});

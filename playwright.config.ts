import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 配置（ADR-0017）。
 *
 * - 按 Next.js 16.4.6 官方测试指南（node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md）
 *   的 webServer 推荐姿势，对生产构建跑测试：command 先 build 再 start，
 *   Playwright 对 url 探活后才执行用例；
 * - 浏览器矩阵 MVP 仅 Chromium（Firefox/WebKit 按需再加，不做全矩阵门禁）；
 * - CI 中 headless + 失败重试 + 复用已有服务一律关闭（防误连陈旧产物）；
 *   本地 reuseExistingServer 以便开发服务器已在跑时直接复用；
 * - `instant()` helper（@next/playwright）不在 config 层挂载，待有真实
 *   cacheComponents 导航用例时在 spec 中按官方 instant-navigation 指南使用。
 */
export default defineConfig({
  testDir: "e2e",
  // E2E 与单测互不越界：vitest 的 include 已锁定 tests/**，此处 testDir 锁定 e2e/。
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});

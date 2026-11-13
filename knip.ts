import type { KnipConfig } from "knip";

/**
 * 死代码检测配置（npm run lint:unused）。
 *
 * - 仓库为 npm workspaces 单仓，但 website/ 是独立文档站（Docusaurus 自带工具链）、
 *   packages/ 暂空，均不纳入主应用死代码分析；
 * - src/{modules,agent,db,lib,components,stores,locales} 当前为仅含 .gitkeep 的骨架：
 *   .gitkeep 无源码扩展名、favicon.ico 由 next 插件按 App Router 约定识别，
 *   均不会进入待分析文件集，故无需额外 ignore（加了反而触发 knip 的配置提示）。
 */
const config: KnipConfig = {
  // website 文档站不参与分析（Docusaurus 自带工具链）。
  ignoreWorkspaces: ["website"],

  ignoreDependencies: [
    // 由 .githooks/pre-commit 经 npx 调用，knip 无法从 import/脚本中识别。
    "lint-staged",
    // ADR-0017 专项：与 next 锁步安装（16.4.6 精确版）的 @next/playwright，
    // 其 instant() helper 待出现真实 cacheComponents 导航用例时才在 e2e spec
    // 中 import（届时需按官方指南开启 exposeTestingApiInProductionBuild）。
    // 框架落地阶段无任何 import 面，属有意前置安装而非死依赖。
    "@next/playwright",
  ],

  workspaces: {
    ".": {
      // Next.js App Router 入口（page/layout/route 等由 knip 的 next 插件兜底识别）
      // + 测试入口。vitest.config.ts 与 playwright.config.ts 及各自 testDir
      // 匹配由 knip 内置的 vitest/playwright 插件识别，无需在此重复声明。
      entry: [
        "src/app/**/*.{ts,tsx}",
        "tests/**/*.test.{ts,tsx}",
        "e2e/**/*.spec.ts",
      ],
      // 分析范围：主应用源码 + 单测/E2E 目录 + 测试启动包装脚本（不含文档站）。
      project: [
        "src/**/*.{ts,tsx}",
        "src/**/*.css",
        "tests/**/*.{ts,tsx}",
        "e2e/**/*.ts",
        "scripts/**/*.mjs",
      ],
    },
  },
};

export default config;

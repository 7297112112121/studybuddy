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
  ],

  workspaces: {
    ".": {
      // Next.js App Router 入口（page/layout/route 等由 knip 的 next 插件兜底识别）。
      entry: ["src/app/**/*.{ts,tsx}"],
      // 分析范围限定在主应用源码，不含文档站与工具链配置。
      project: ["src/**/*.{ts,tsx}", "src/**/*.css"],
    },
  },
};

export default config;

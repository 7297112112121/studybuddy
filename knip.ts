import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // website 文档站不参与分析（Docusaurus 自带工具链）；studybuddyui 为 UI 草稿
  // 工作区（独立 Vite 工具链），均不纳入主应用死代码分析。
  ignoreWorkspaces: ["website", "studybuddyui"],

  ignoreDependencies: [

    "lint-staged",

    "@next/playwright",
  ],

  workspaces: {
    ".": {

      entry: [
        "src/app/**/*.{ts,tsx}",

        "src/components/ui/**/*.tsx",
        "tests/**/*.test.{ts,tsx}",
        "e2e/**/*.spec.ts",
      ],

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

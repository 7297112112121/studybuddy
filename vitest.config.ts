import path from "node:path";
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
 * - exclude 掉 tests/endpoint/** 与 tests/migrations/**：接口测试走
 *   vitest.config.endpoint.ts 分轨（端点直调 + 落库断言，真实 PG）——
 *   CI 无数据库服务上下文，`npm test` 不得触达。
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      /**
       * next-intl（Task 8，ADR-0010）：单测（无 react-server 导出条件）下
       * `next-intl/server` 会解析到 react-client 桩并在调用时抛
       * "getRequestConfig is not supported in Client Components"。
       * 此处按 Next 生产接线等价别名：server 入口指向 react-server 构建
       * （getRequestConfig 为恒等函数），`next-intl/config` 与
       * createNextIntlPlugin 一样指向 src/i18n/request.ts。
       * 仅影响单测解析，不改变产品构建行为。
       */
      "next-intl/server": path.resolve(
        "node_modules/next-intl/dist/esm/development/server.react-server.js",
      ),
      "next-intl/config": path.resolve("src/i18n/request.ts"),
      // next 包无 exports map，react-server 构建内 `import 'next/headers'`
      // （无扩展名）在 ESM 解析下失败，需显式指向 CJS 入口文件。
      "next/headers": path.resolve("node_modules/next/headers.js"),
    },
  },
  test: {
    environment: "jsdom",
    server: {
      deps: {
        // next-intl 默认被外部化、由 Node 原生 ESM 加载，别名不生效；
        // 仅内联 react-server 分支（request.test.ts 经别名命中），
        // 其内部 `import 'next/headers'` 等才走上方 resolve.alias。
        inline: [/next-intl\/dist\/esm\/development\/server[.\/]/],
      },
    },
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/endpoint/**", "tests/migrations/**", "**/node_modules/**"],
    /**
     * 覆盖率（ADR-0036）：默认关闭，`npm run test:report` 经 --coverage 开启。
     * 分母 src/** 减白名单（迁移生成物、shadcn 复制件、类型声明）；reporters
     * 三件套分别供终端摘要（text）、CI Job Summary 渲染（json-summary）、
     * 本地 HTML 临时报告（html，落 gitignored coverage/）消费。
     * 阈值门禁（合格率要求见 docs/dev/单元测试纪律.md）：分支覆盖率低于
     * 阈值时开覆盖率跑即非零退出（CI PR 为变更文件增量分母，本地为全局
     * 分母）；其余指标纯报告。
     */
    coverage: {
      provider: "v8",
      enabled: false,
      include: ["src/**"],
      exclude: ["src/db/migrations/**", "src/components/ui/**", "**/*.d.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { branches: 60 },
    },
  },
});

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl 插件（ADR-0010）：默认探测 ./src/i18n/request.ts 作为请求级
 * i18n 配置（语言协商与文案装配），无需显式传路径。
 */
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 自托管部署形态（ADR-0016）：standalone 输出最小 server.js 运行产物，
  // 供多阶段 Dockerfile 打包；构建期不注入环境变量，运行时注入实现单镜像多环境
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);

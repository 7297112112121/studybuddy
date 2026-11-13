import type { NextConfig } from "next";

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

export default nextConfig;

---
title: ADR-0001：采用 Next.js 16 作为全栈框架
description: 为什么选择 Next.js 16（App Router + Turbopack + cacheComponents）作为 studybuddy 的唯一全栈框架
---

# ADR-0001：采用 Next.js 16 作为全栈框架

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 团队为小规模团队，React 技术栈，需要一套代码同时交付前端界面与服务端 API，无力维护前后端两个独立工程。
- 产品形态是「AI 一体化学业与生涯陪伴平台」：对话式交互（流式输出）、RAG 检索、个性化看板，对首屏性能与流式渲染有现实需求。
- 产品边界明确不对接企业 HR 与高校教务系统（见产品简介），服务端只需服务自有 Web 客户端，BFF（Backend for Frontend）模式即可覆盖。
- 仓库现状：next 16.4.6 + react 19.3 + TypeScript strict 已就位，`next.config.ts` 启用 `cacheComponents` 与 `partialPrefetching`，npm workspaces（`packages/*` + `website`）。
- Next.js 16 与旧版本差异显著：Turbopack 成为 dev/build 默认打包器；`next lint` 命令被移除；`middleware` 更名为 `proxy` 且仅支持 Node.js runtime；Request API（`params`、`cookies` 等）完全异步化；`cacheComponents` 成为 PPR 的正式启用方式。

## 决策

采用 Next.js 16 作为唯一全栈框架：App Router 承载路由与渲染（见 ADR-0002），Route Handlers 与 Server Actions 承载服务端能力，服务端组件直连数据层（见 ADR-0005、ADR-0006）。部署目标以 Docker 自托管为主，保持与 Vercel 等平台的兼容性。所有 Next.js 相关实现细节以本地 `node_modules/next/dist/docs/` 的版本匹配文档为准，不以训练记忆或旧版社区文章为准。

## 备选方案

### Remix / React Router v7
- 优点：数据加载与表单抽象清晰；React Router 7 框架模式稳定。
- 缺点：社区与商业支持在近年经历重组，长期走向的不确定性高于 Next.js；流式渲染与缓存语义需要自建的部分更多。
- 否决原因：生态规模与 AI 场景配套（流式 UI、AI SDK 生态）不如 Next.js 成熟。

### TanStack Start
- 优点：类型安全的路由与 loader 设计出色，与 TanStack Query 同源。
- 缺点：框架尚年轻，大版本迭代快，生产案例相对少。
- 否决原因：0.1.0 阶段引入高风险新框架不划算。

### Vite SPA + 独立后端（NestJS 等）
- 优点：前后端各自自由度最大，后端可独立扩展。
- 缺点：两套工程、两套部署，类型共享依赖额外手段；SEO 与首屏需另做 SSR；团队规模撑不起双栈。
- 否决原因：产品边界内不需要独立对外后端，收益不抵成本。

## 后果

### 正面
- 单工程全栈，类型从数据库到 UI 一条链贯通（配合 ADR-0006、ADR-0008）。
- 服务端组件 + 流式渲染贴合 AI 对话与看板场景；`cacheComponents` 为「静态外壳 + 动态岛屿」的性能模型提供官方路径。
- Turbopack 默认化带来更快的开发与构建反馈。

### 负面
- Next.js 16 大量「反训练记忆」的变更，AI 辅助开发与社区检索时必须对照本地文档校验。
- RSC 边界（server/client、缓存语义）有学习曲线，代码评审需要新增检查点。
- 深度绑定 React 生态（放弃 SvelteKit / Vue 系）。

### 风险
- `cacheComponents` 属于较新的稳定特性，minor 版本升级可能出现行为修正，升级需读 release note 并回归核心页面。
- 自托管需自行承担运维，Postgres（ADR-0005）与 Redis（ADR-0007）一并纳入 compose 编排。

## 相关决策

- [ADR-0002：路由采用 App Router](./app-router)
- [ADR-0005：PostgreSQL 17 + pgvector](./postgresql-pgvector)
- [ADR-0008：tRPC API 层](./trpc)

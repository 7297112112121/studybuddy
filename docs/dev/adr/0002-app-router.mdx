---
title: ADR-0002：路由采用 App Router
description: 全部路由使用 App Router，不混用 Pages Router；请求级网络介入使用 proxy
---

# ADR-0002：路由采用 App Router

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- Next.js 16 中 Pages Router 进入维护状态：`cacheComponents`、`next/root-params`、部分预渲染等新能力仅在 App Router 提供。
- 项目无历史路由包袱（`app/` 目录目前仅含根布局与首页）。
- 产品页面结构是「嵌套布局 + 会话式子页面」型（导航壳、AI 对话页、学业看板页），与布局嵌套模型契合。

## 决策

全部路由使用 App Router；不混用 Pages Router；路由段约定（`layout`、`page`、`loading`、`error`、`route`）按 Next 16 版本文档执行。需要请求级网络介入（语言协商、鉴权重定向）时使用 `proxy.ts`（原 middleware，Node.js runtime）。

## 备选方案

### Pages Router
- 优点：旧知识兼容，`getServerSideProps` 心智成熟。
- 缺点：不再获得新特性；`cacheComponents`/PPR、根参数、并行路由等不可用；数据获取与页面组件耦合。
- 否决原因：新项目选择一个不再演进的路由体系没有未来。

### 纯客户端 SPA 路由（React Router）
- 优点：路由完全在客户端，部署产物简单。
- 缺点：放弃服务端组件、流式渲染与 SEO；落地页、帮助中心等静态内容页的收益受损。
- 否决原因：与 ADR-0001 的全栈框架决策冲突。

## 后果

### 正面
- 布局嵌套与局部导航保留 UI 状态，对话页与看板页间切换体验好。
- 服务端组件默认化：数据获取代码天然留在服务端，敏感信息不进客户端包。
- 异步 `params`/`searchParams` 与 `PageProps`/`LayoutProps` 全局类型提供严格类型路由。

### 负面
- 约定密度高：Suspense 边界、`use cache`、动态参数 await 都是硬性纪律，遗漏会在构建或运行期报错。
- 第三方组件库需兼容 React 19 与 RSC（ADR-0004 已纳入验证项）。

### 风险
- `proxy` 仅支持 Node.js runtime，迁移社区 middleware 生态方案时需确认其 runtime 假设。

## 相关决策

- [ADR-0001：Next.js 16 全栈框架](./nextjs-fullstack-framework)
- [ADR-0010：国际化方案](./i18n)

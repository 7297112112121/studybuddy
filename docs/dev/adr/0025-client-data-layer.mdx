---
title: ADR-0025：客户端数据层采用 TanStack Query + Server Actions（取代 tRPC）
description: 取代 ADR-0008：不引入 tRPC，客户端查询/轮询/乐观更新由 TanStack Query 包裹 Server Function 承载，端到端类型由 Server Functions 自带 RPC 类型提供，错误协议自维护判别联合
---

# ADR-0025：客户端数据层采用 TanStack Query + Server Actions（取代 tRPC）

## 状态

已接受（Accepted，取代 [ADR-0008](./trpc)）

## 日期

2026-11-13

## 背景

- ADR-0008 引入 tRPC 的两个核心诉求：客户端数据场景的端到端类型、入参校验收口。而缓存、轮询、乐观更新的语义实际由其底层的 TanStack Query 提供——tRPC 在栈中的边际贡献只有「类型安全传输层 + procedure 组织」。
- 复盘发现栈内已存在零成本的类型安全传输层：`'use server'` 导出的 Server Function 从客户端调用即自带端到端类型，zod 校验可以内聚在函数体内。tRPC 的两个核心卖点均被覆盖。
- 本产品客户端查询端点为个位数（看板轮询、打卡/计时乐观更新），procedure 分组、middleware 链等组织能力没有规模收益。
- tRPC 与 Next.js 大版本兼容偶有滞后（ADR-0008 已列为风险），Next 16 周期下是持续摩擦点；且流式对话已由 ADR-0014 划至 Route Handler，tRPC 剩余职责进一步收窄。
- Next.js 16 官方文档明确 Server Actions 的分发语义："Next.js dispatches Server Actions one at a time per client"——**客户端分发器对每个客户端串行分发 action**（服务端不排队），文档建议需要并行或非变更请求时用 Route Handler（`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`）。本决策必须在此约束下划清分工。

## 决策

不引入 tRPC，废止 ADR-0008 的 API 层选型。客户端数据层分工：

> 术语说明：本 ADR 标题与各处引述沿用「Server Actions」统称；按 Next 16 官方术语，`'use server'` 导出的函数统称 Server Function，经 React action 机制调用者才称 Server Action，查询场景（queryFn 直调）实为前者。

1. 服务端组件读数据 → 直接调用 Drizzle 服务层（承 ADR-0008 边界第 1 项）；
2. 表单类突变 → Server Actions（承 ADR-0008 边界第 2 项）；
3. 客户端数据获取、轮询、乐观更新 → **TanStack Query（v5）包裹 Server Function 调用**：action 即 queryFn / mutationFn，类型自动贯通，zod 校验放在函数体内（schema 从 Drizzle 表结构推导，承 ADR-0006）；
4. 流式对话 → Route Handler（承 ADR-0014，不变）；
5. 错误协议：Server Function 不向客户端抛裸异常（生产环境下服务端错误到达客户端时只剩通用消息与 `digest`，无法分支处理），统一返回判别联合 `{ ok: true, data } | { ok: false, error }`，由调用侧与 TanStack Query 的 error 分支消费——这是 tRPC typed error 的等价替代，属自维护约定；
6. 逃生舱：需要 HTTP GET 语义、浏览器/CDN 缓存或并行分发的端点，单独 Route Handler 承载，客户端以 type-only import 复用其导出类型（`import type` 不会把服务端代码引入客户端 bundle）；当前无此场景，出现时按需新增。

TanStack Query 由 ADR-0008 的隐性底层升级为本决策的显式选型；zod schema 仍从 Drizzle 表结构推导，消费方由 tRPC procedure 改为 Server Function 入参（ADR-0006 已同步修订）。

## 备选方案

### 维持 tRPC（ADR-0008 现状）
- 优点：procedure 组织、typed error、superjson 序列化开箱即用；不受 action 客户端串行分发约束。
- 缺点：多一层抽象与一个运行时依赖；与 Next 大版本存在兼容滞后风险；个位数查询端点下组织能力无规模收益；团队学习与心智负担。
- 否决原因：核心卖点（端到端类型 + 校验收口）已被 Server Functions 覆盖，边际成本大于边际收益。

### 手写 Route Handlers + TanStack Query
- 优点：HTTP 语义完整（GET、缓存头、可并行分发），是官方对非变更请求的推荐形态。
- 缺点：每个端点要手写 handler 与客户端 typed fetch 包装，类型两端手动对齐，是漂移温床——正是 ADR-0008 引入 tRPC 想解决的问题。
- 否决原因：栈内已有类型安全 RPC（Server Functions）时纯增工作量。保留为逃生舱（决策第 6 条）。

### SWR
- 优点：体积极小，stale-while-revalidate 心智简单；Vercel 出品，与 Next.js 亲和。
- 缺点：乐观更新与回滚、mutation 生命周期、失效编排均无一等公民 API，需手写；devtools 与生态弱于 TanStack Query。
- 否决原因：本产品客户端场景的核心正是打卡/计时的乐观更新与看板轮询（见背景），恰是 TanStack Query 的强项；且 ADR-0008 时期底层已是 TanStack Query，团队心智已定。

### 仅 Server Actions、不引入 TanStack Query
- 优点：依赖最少。
- 缺点：轮询（refetchInterval）、乐观更新与回滚（onMutate）、缓存与失效均需手写——这些从来不是 Next 原生能力。
- 否决原因：客户端缓存语义仍需成熟库承载；ADR-0008 原方案底层亦是 TanStack Query，本决策只是去掉其上的 tRPC 层。

## 后果

### 正面
- 少一个运行时依赖与一层抽象；消除 tRPC × Next 大版本兼容风险点与团队学习负担。
- 端到端类型链不变：PG 表（Drizzle）→ zod → Server Function → 客户端 hooks 全程推断，改表时客户端报错即时暴露。
- 全部落在 Next / React 生态主线（Server Actions、TanStack Query），无第二套 RPC 心智。

### 负面
- 错误协议由框架内建改为自维护约定（判别联合返回），纪律成本由团队承担。
- 受「每客户端串行分发」约束：客户端并发触发的多个 action 依次执行，同屏多查询的总时延为累加而非取最大值。缓解：首屏数据走 RSC（ADR-0008 边界第 1 项不变），客户端查询保持少量且轻。
- Server Actions 均为 POST，无 HTTP 缓存语义；需要 GET 语义的端点须走逃生舱并手写类型对接。
- tRPC 的 procedure 分组与 middleware 链放弃，以目录约定（如 `app/_server/` 或服务层模块）替代。

### 风险
- 若未来出现重交互客户端区域（数十个查询端点），端点组织与错误协议的手工成本会放大；届时以新 ADR 重新评估引入 tRPC（可逆，与 ADR-0008 对 REST 门面的论证同构）。
- 串行分发对轮询场景的实际影响（轮询排队等待在途 mutation）需在实现阶段以真实时延验证，超预期则该端点改走逃生舱。

## 相关决策

- 取代 [ADR-0008：API 层采用 tRPC](./trpc)
- [ADR-0006：Drizzle ORM](./drizzle-orm)（zod schema 消费方由 tRPC procedure 改为 Server Function，已修订）
- [ADR-0009：zustand](./zustand)（服务端数据来源表述已修订）
- [ADR-0013：Better Auth](./better-auth)（鉴权注入点由 tRPC context 改为服务端直接调用，已修订）
- [ADR-0014：Vercel AI SDK](./vercel-ai-sdk)（非流式业务能力由 tRPC procedure 改走 Server Function，已修订）

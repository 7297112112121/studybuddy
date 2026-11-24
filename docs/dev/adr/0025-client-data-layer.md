---
title: ADR-0025：客户端数据层采用 Route Handler + Server Actions
description: 服务端组件直读服务层；突变走 Server Actions，客户端查询与轮询走 Route Handler；错误协议自维护判别联合，不引入客户端数据缓存库
---

# ADR-0025：客户端数据层采用 Route Handler + Server Actions

## 状态

已取代（Superseded）

## 日期

2026-11-23

## 背景

- 客户端数据场景为个位数端点：看板轮询、打卡/计时乐观更新、表单突变。
- Next.js 16 官方文档明确 Server Actions 的分发语义："Next.js dispatches Server Actions one at a time per client"——**客户端分发器对每个客户端串行分发 action**（服务端不排队），文档建议需要并行或非变更请求时用 Route Handler（`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`）。
- Server Actions 均为 POST，无 HTTP GET 语义；查询与轮询需要 GET 语义及浏览器/CDN 缓存。
- 生产环境下服务端错误到达客户端时只剩通用消息与 `digest`，无法分支处理，错误协议需自维护。

## 决策

客户端数据层分工：

1. 服务端组件读数据 → 直接调用 Drizzle 服务层，首屏数据不经客户端请求；
2. 表单类突变 → Server Actions：zod 校验内聚在函数体内（schema 从 Drizzle 表结构推导，承 ADR-0006），乐观更新用 React `useOptimistic`，完成后经 `revalidatePath` 失效缓存；
3. 客户端数据获取、轮询 → **Route Handler**：HTTP GET 语义，浏览器/CDN 缓存与并行分发开箱即用；客户端以 type-only import 复用其导出类型（`import type` 不会把服务端代码引入客户端 bundle）；
4. 流式对话 → Route Handler；
5. 错误协议：Server Action 不向客户端抛裸异常，统一返回判别联合 `{ ok: true, data } | { ok: false, error }`，由调用侧分支消费；Route Handler 以 HTTP 状态码 + JSON body 表达错误；
6. 不引入客户端数据缓存库（TanStack Query、SWR）：服务端数据由 RSC 直读与 Route Handler 承载，客户端不为服务端数据维护第二份缓存层。

> 术语说明：按 Next 16 官方术语，`'use server'` 导出的函数统称 Server Function，经 React action 机制调用者才称 Server Action；本 ADR 的突变场景为后者。

## 备选方案

### TanStack Query + Server Actions
- 优点：轮询（refetchInterval）、乐观更新与回滚（onMutate）、缓存与失效编排均有一等公民 API，devtools 成熟。
- 缺点：多一个运行时依赖与一套客户端缓存心智；缓存真源在服务端，客户端缓存层与之重叠；本产品端点个位数，编排能力无规模收益。
- 否决原因：乐观更新由 React `useOptimistic` 覆盖，轮询由 Route Handler 加定时器承载，客户端缓存层属冗余。

### SWR
- 优点：体积极小，stale-while-revalidate 心智简单；Vercel 出品，与 Next.js 亲和。
- 缺点：乐观更新与回滚、mutation 生命周期、失效编排均无一等公民 API，devtools 与生态弱于 TanStack Query。
- 否决原因：与 TanStack Query 同一否决理由，能力又更弱。

### 全部客户端请求走 Server Actions
- 优点：端点与服务层同构，不建 HTTP 层，类型全程推断。
- 缺点：受「每客户端串行分发」约束，同屏多查询的总时延为累加而非取最大值；均为 POST，无 GET 缓存语义。
- 否决原因：查询与轮询的并行分发与缓存诉求由 Route Handler 承载（决策第 3 条）。

## 后果

### 正面
- 传输层全部落在 Next / React 原生形态（Server Actions、Route Handler），零新增运行时依赖，无第二套 RPC 心智。
- 查询具备 HTTP GET 语义：浏览器/CDN 缓存、并行分发开箱即用，不受串行分发约束。
- 端到端类型链：PG 表（Drizzle）→ zod → 服务层 → 客户端经 `import type` 贯通，改表时客户端报错即时暴露。

### 负面
- Server Action 错误协议为自维护约定（判别联合返回），纪律成本由团队承担。
- Route Handler 端点需手写 handler 与客户端调用，类型两端靠 `import type` 对齐，存在漂移可能，以导出类型约定约束。
- 轮询、乐观更新无第三方库编排，各端点自行实现（定时器 + `useOptimistic`）。

### 风险
- 若未来出现重交互客户端区域（数十个查询端点），客户端缓存与请求去重缺失会放大重复请求成本；届时以新 ADR 重新评估引入客户端数据缓存库（可逆）。
- 乐观更新在 Server Action 串行分发下的实际时延需在实现阶段以真实场景验证，超预期则该突变改走 Route Handler。

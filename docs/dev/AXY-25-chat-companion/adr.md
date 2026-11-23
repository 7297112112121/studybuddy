---
title: "Design: AXY-25 陪伴闲聊伙伴 · 与 ADR 的关系"
description: AXY-25 的 ADR 一致性一页纸与 Q 条目去向
sidebar_position: 5
---

# Design: AXY-25 陪伴闲聊伙伴 · 与 ADR 的关系

> 本文件为 design 的拆出节，批准状态以 [design.md](design) 头部表为准，不另设状态列。

## 一致性对照

| 涉及技术 | ADR | 一致性 |
| -------- | --- | ------ |
| AgentScope 2.0（Agent Service / Context 记忆 / 用户隔离 / Credential 凭据） | ADR-0029 | 一致——python 服务进同一 compose 仅内网可达；记忆经内建文件式中间件承载；用户隔离对接 Better Auth 会话；凭据走 Credential 配置禁硬编码；依赖钉 2.x minor |
| 长期记忆（Mem0 OSS + pgvector） | ADR-0032 | 一致——记忆经内建 Mem0Middleware 承载 mem0 OSS AsyncMemory，vector store 与 history 落自有 PostgreSQL；不用托管平台，不自建记忆中间件；embedding 用智谱 Embedding-3（经 OpenAI 兼容端点，凭据走环境变量） |
| SSE 流式链路 | ADR-0030 | 一致——agent-service 用 Agent Service 会话事件流不自建协议；Next Route Handler `ReadableStream` 加工并关代理缓冲（协议层落点：`x-accel-buffering: no`）；用户输入走普通 POST |
| AI SDK UI 流式渲染 | ADR-0031 | 一致——`useChat` + `DefaultChatTransport` 指向自有 Route Handler；不用 AI SDK 自带服务端实现做模型调用；事件流到 UI 消息协议的转换收敛在 Next 加工层；依赖钉 `ai@7.0.x` / `@ai-sdk/react@4.0.x` minor，代码以随包文档为真源 |
| python 服务落点 | 架构评审 #89（agent-service-placement） | 一致——代码落顶层 `agent-service/`，双应用镜像同一 compose |
| Next.js 16 / App Router | ADR-0001 / 0002 | 一致——流式 Route Handler 为官方一等支持；cacheComponents 语义遵守 |
| 认证与会话 | ADR-0013 | 一致——鉴权经 `auth.api.getSession`，守卫沿用 (app) 布局组 |
| PostgreSQL 17 + pgvector | ADR-0005 | 一致——聊天表与记忆向量同库同事务，不引独立向量库 |
| Drizzle ORM | ADR-0006 | 一致——迁移经 drizzle-kit 生成 SQL 入库评审，禁手改 |
| Redis | ADR-0007 | 一致——仅承载可重建/可过期数据（流会话缓冲），持久事实以 PG 为准 |
| 客户端数据层 | ADR-0025 | 一致——首屏历史 RSC 直读（queries）；流与突变走 Route Handler；错误经判别联合不抛裸异常 |
| Tailwind CSS 4 / shadcn/ui | ADR-0003 / 0004 | 一致——新增颜色间距进 `@theme`；聊天渲染组件沿用 shadcn 体系组装 |
| zustand | ADR-0009 | 一致——聊天流状态由 `useChat` 托管，服务端数据不进 store |
| Vitest / Playwright | ADR-0012 / 0017 | 一致——LLM 调用与 agent-service 一律 mock，E2E 只测关键旅程 |

无新增 ADR：本特性全部技术要点均有现行 ADR 或已批准评审覆盖。

## Q 条目去向

本设计不含以下条目的验证，由测试提质阶段验收：

- Q1（回复首字 ≤ 3s）
- Q2（单次回复完整呈现 ≤ 15s）
- Q3（跨天记忆引用正确性抽测 ≥ 7/10）
- Q4（回复长度纪律抽测 ≥ 9/10）

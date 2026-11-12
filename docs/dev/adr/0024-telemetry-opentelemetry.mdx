---
title: ADR-0024：可观测性采集层采用 OpenTelemetry 标准
description: 以 OpenTelemetry 为唯一采集标准——Next.js instrumentation 经 @vercel/otel 注册、AI SDK 7 registerTelemetry 以 OTLP 导出到 ADR-0019 的栈；涉敏链路关 recordInputs/recordOutputs；错误事件走 @sentry/nextjs（ADR-0023）为标准外独立通道
---

# ADR-0024：可观测性采集层采用 OpenTelemetry 标准

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 本 ADR 由 ADR-0019 拆分而来，决策事实与证据均于 2026-11-12 确立。
- Next.js 16（仓库内 16.4.6 文档）对 OpenTelemetry 有一等支持：官方 OTel 指南开头即 "We recommend using OpenTelemetry for instrumenting your apps... a platform-agnostic way to instrument apps that allows you to change your observability provider without changing your code"，并声明 "Next.js supports OpenTelemetry instrumentation out of the box"；`instrumentation.ts` 提供 `register()`（服务启动时注入埋点）与 `onRequestError`（服务端错误钩子），官方快速上手包为 `@vercel/otel`。
- ADR-0014 已定 Vercel AI SDK（当前 v7.0.170）。AI SDK 7 的遥测是内置且默认开启的：官方迁移指南原文 "In AI SDK 7, telemetry is opt-out: once you register a telemetry integration such as `OpenTelemetry`, all AI SDK calls emit telemetry events by default"；输入输出默认记录、可按链路关闭（"By default, both inputs and outputs are recorded. You can disable them by setting the `recordInputs` and `recordOutputs` options to `false`"）——后者是 LLM 追踪数据边界的开关。
- ADR-0014 留下流式链路端到端复盘的诉求，LLM 调用链路要有数据面。
- LLM 追踪会包含用户学习内容（涉敏），ADR-0005 的数据自持约束同样适用于采集层。

## 决策

采集层以 **OpenTelemetry 为唯一采集标准**（业务代码的唯一侵入点）。

- **注册**：`instrumentation.ts` 中经 `@vercel/otel` 注册 OTel；AI SDK 7 侧 `registerTelemetry(new OpenTelemetry())`（`@ai-sdk/otel`），模型调用的 span（模型名、耗时、token、输入输出）随请求 trace 一起以标准 OTLP 导出到 ADR-0019 的 Grafana 栈。
- **涉敏开关**：涉及敏感学习内容的链路用 `recordInputs/recordOutputs: false` 关闭内容记录，只留时序。
- **边界**：错误事件走 `@sentry/nextjs`（ADR-0023）是本标准之外的独立通道——错误上报不经 OTel 管道，DSN 直指自托管 GlitchTip。

## 备选方案

### 无统一采集标准，各后端原生 SDK 直连
- 优点：每个后端用自己的原生 SDK（prom-client 抓指标、日志直推后端），没有中间标准层，概念最少。
- 缺点：换后端即改埋点代码，丧失厂商中立（官方定位引文见背景）；AI SDK 7 的遥测原生产出 OTel 事件，绕开标准层反而要自建管道。
- 否决原因：Next.js 16 官方一等支持 OTel（引文见背景），原生 SDK 直连同时放弃厂商中立与 LLM span 的零成本通道。

### 以 Sentry SDK 为唯一采集层（错误+性能+追踪全走 Sentry 生态）
- 优点：一套 `@sentry/nextjs` SDK 覆盖错误与性能追踪，生态成熟、与框架深度集成。
- 缺点：自托管版硬件门槛（16GB 内存级）不可行（ADR-0023 背景已证）；SaaS 数据存境外，违反 ADR-0005 边界；AI SDK 7 的 LLM span 原生产出 OTel 事件，走 Sentry 管道会丢失零成本 LLM 链路。
- 否决原因：硬件与数据边界双重关闭，且放弃 OTel 的 LLM span 零成本通道。

## 后果

### 正面
- **厂商中立**：未来换 Sentry、SigNoz 或任何 OTel 后端都不改业务代码——采集层与后端栈（ADR-0019）解耦。
- **LLM 链路零额外成本打通**：AI SDK 7 遥测默认全开（opt-out），模型调用的 span 与 HTTP 请求 span 在同一 trace（追踪后端 Tempo 见 ADR-0019），ADR-0014 留下的"流式链路调优"诉求有了数据面。
- 采集层依赖干净：ai、@opentelemetry/api、@vercel/otel 经 OSV 查证 **0 条** 安全通告（2026-11-12）。

### 负面
- `instrumentation.ts` 与 AI SDK 遥测注册是可观测性对业务代码的唯一侵入点，埋点代码随业务仓库一起演进维护。

### 风险
- **追踪数据含敏感内容**：LLM 输入输出默认被记录（AI SDK 官方行为），涉密链路显式关 `recordInputs/recordOutputs`，保留期内数据视为用户数据处理，写进部署清单。

## 相关决策

- [ADR-0005：PostgreSQL 17 + pgvector（数据自持约束来源）](./postgresql-pgvector)
- [ADR-0014：LLM 接入层 Vercel AI SDK](./vercel-ai-sdk)
- [ADR-0019：可观测性后端 Grafana 栈](./observability-grafana-stack)
- [ADR-0023：错误上报 GlitchTip](./error-reporting-glitchtip)

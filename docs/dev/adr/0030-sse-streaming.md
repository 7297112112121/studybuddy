---
title: ADR-0030：AI 流式链路采用 SSE 全链
description: python AI 服务以 Agent Service 会话事件流输出，Next Route Handler 流式加工后经 SSE 下发前端打字机；不引入 WebSocket/gRPC，双向实时需求出现时另立 ADR 追加通道
---

# ADR-0030：AI 流式链路采用 SSE 全链

## 状态

已接受（Accepted）

## 日期

2026-11-23

## 背景

- 流式链路需求：AI 回复流式输出 + 前端实时打字机效果；整体数据流向已定为前端 react 页 → Next 后端 → python AI 服务（流向本身归 design 正文，本决策只选通道协议）。
- 约束：前端只连 Next，python 服务不暴露公网；近期交互形态为单向流式文本，用户输入走普通请求；Next 在链路中承担鉴权绑定与内容加工，不是纯透传管道。
- 选型事实（查证日期 2026-11-23，来源：Next 16.4.6 随包文档 `node_modules/next/dist/docs`、AgentScope 2.0.12 官方文档）：
  - Next Route Handler 流式为一等支持：官方文档明示「Streaming 常与 LLM 配合使用」，`ReadableStream` 方案开箱可用（route.md）。
  - Next handler 层 WebSocket 官方明示不可行：「WebSockets won't work——连接会因超时或响应生成后关闭」（backend-for-frontend.md）。
  - python 侧框架内建流式：AgentScope Agent Service（FastAPI 承载）的会话事件流支持多订阅者扇出与断线重连回放缓冲历史（agent-service.md）。
- 部署形态为 Docker Compose 单机自托管，python 服务仅内网可达。

## 决策

AI 流式链路采用 SSE/HTTP 流式全链：

1. python AI 服务以 Agent Service 会话事件流对外输出，不自建流式协议；
2. Next Route Handler 以 `ReadableStream` 拉取内网流，经 Better Auth 会话鉴权与内容加工（裁剪、事件重组）后以流式响应下发前端，并关闭代理缓冲（响应头禁缓冲）；
3. 前端以 fetch 流式读取消费打字机渲染，用户输入与突变走普通 POST，不经流通道；
4. python 服务仅 compose 内网可达，前端不直连；
5. 不引入 WebSocket 与 gRPC：单向流式文本场景不需要双向通道，避免为未到来的需求承担协议栈复杂度；
6. 未来出现语音、实时打断等双向实时需求时，以新 ADR 追加实时通道，不改造本通道。

## 备选方案

### WebSocket 全链

- 优点：双向实时低延迟，天然兼容未来语音/打断/多模态；内外网协议统一。
- 缺点：Next 官方文档明示 handler 层 WebSocket 不可行，需自建 ws 服务破坏 standalone 单镜像部署形态；单向文本场景过度设计。
- 否决原因：与 Next 处理面和部署形态正面冲突，双向能力在近期需求中无人消费。

### gRPC 内网 + SSE 出口

- 优点：内网强类型 proto 契约，双向流，协议演进有 schema 保障，python 侧生态成熟。
- 缺点：双协议栈并存，Node 侧 gRPC 客户端带原生依赖、standalone 构建链路复杂，proto 对个位数端点维护成本不划算。
- 否决原因：复杂度与初期规模不匹配，Next 出口仍需转 SSE，双栈只增加成本不增加能力。

## 后果

### 正面

- 全链零额外协议栈：两端流式能力（Next Route Handler、Agent Service 会话流）均为官方一等支持。
- 断线重连回放由 Agent Service 内建承担，前端重连即续流。
- 与既有客户端数据层分工同构（查询与流走 Route Handler），不引入第二套传输心智。

### 负面

- SSE 为单向通道，双向实时能力缺位（近期无此需求）。
- Next 中转层需自行处理代理缓冲与背压，是自维护的适配代码。
- Agent Service 事件流到前端打字机的事件语义需一层适配（事件重组、裁剪）。

### 风险

- Next 中转缓冲对长响应的内存占用需在实现期以真实场景验证。
- 未来双向实时需求出现时将触发新通道 ADR，届时需评估与 SSE 通道的并存策略。

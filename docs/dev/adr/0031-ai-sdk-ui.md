---
title: ADR-0031：AI UI 流式渲染采用 AI SDK
description: 前端 AI UI 采用 AI SDK（ai + @ai-sdk/react）：useChat 承载聊天流与打字机，message parts 承载生成式 UI，transport 指向自有 Route Handler；不引入第二套聊天组件库
---

# ADR-0031：AI UI 流式渲染采用 AI SDK

## 状态

已接受（Accepted）

## 日期

2026-11-23

## 背景

- AI UI 需求：承接流式输出与实时打字机效果，渲染粒度到**生成式 UI**——流式过程中渲染 markdown，工具调用与结构化中间态渲染为组件；实现路线偏好现成库优先；组件基础沿用仓库 shadcn/ui 体系。
- 链路形态：前端只连 Next，消费 Next 加工后的 SSE 流，python 服务不出内网；传输通道与协议已由上游流式链路决策承载，本决策只选前端 UI 层技术。
- 选型事实（查证日期 2026-11-23，来源：npm registry、ai-sdk.dev、assistant-ui.com 官方文档）：
  - AI SDK：`ai` 7.0.179 与 `@ai-sdk/react` 4.0.184（Apache-2.0），官方文档核实 `useChat`（实时流式、托管状态、任意设计集成）与 transport 抽象（`DefaultChatTransport` 指向自定义端点）、`useObject`（流式结构化数据）、聊天工具部件渲染指南。
  - assistant-ui：`@assistant-ui/react` 0.15.38（MIT，0.x 未到 1.0），React 聊天组件库，自带 setup CLI。
  - AgentScope 配套前端：`examples/web_ui` 为示例级 React 前端，直连 Agent Service 原生事件流，框架中间件支持 AG-UI 等协议适配。
- AI SDK 以 API 迭代极快著称，重命名、移除、模型 ID 变动频繁。

## 决策

AI UI 层采用 AI SDK：

1. `useChat` 承载聊天流状态与打字机渲染，message parts 承载工具调用与结构化中间态的生成式 UI，`useObject` 承载流式结构化数据；
2. 传输经 transport 抽象指向自有 Route Handler 端点；不使用 AI SDK 自带服务端实现，Agent Service 事件流到 UI 消息协议的转换由 Next 加工层承载；
3. AI SDK 代码一律以随包安装、版本完全匹配的文档与源码为真源，禁止凭训练记忆书写；发现实装版本落后最新 major 时先向开发者提出升级再继续；
4. 版本钉住具体 minor，major 升级逐次评估；
5. 不引入第二套聊天组件库（assistant-ui 等）；渲染组件沿用 shadcn/ui 体系按需组装，不整体引入外来组件风格。

## 备选方案

### assistant-ui

- 优点：聊天 UI 开箱程度更高（组件级而非 hook 级），MIT 许可，与 shadcn/ui 风格同源，agent 配套文档完善。
- 缺点：版本 0.15.38 未到 1.0，API 稳定性存疑；数据源适配最终仍落到 AI SDK，两层库叠加。
- 否决原因：对个位数聊天端点偏重；其核心价值（数据源运行时）与 AI SDK 重叠，只新增组件层依赖。

### AgentScope 配套前端

- 优点：与 Agent Service 原生事件流零转换，断线回放、多端同步天然可用；框架中间件支持 AG-UI 等协议适配。
- 缺点：示例级前端而非组件库，融入 shadcn/ui、暗色模式与国际化现行体系的成本未知且风格不受控。
- 否决原因：直连 Agent Service 与「前端只连 Next」的既定拓扑冲突；前端体系风格失控风险不可接受。

### 自研 hook

- 优点：零新增运行时依赖，渲染完全受控，与仓库轻依赖路线一致。
- 缺点：生成式 UI 的部件协议、流状态机、中断重连全自建。
- 否决原因：违背「现成库优先」的既定偏好，属查证后无适配库时的兜底而非首选；自建面恰好是 AI SDK 的成熟能力。

## 后果

### 正面

- 生成式 UI 能力（流式 markdown、工具部件、结构化流数据）开箱可用，打字机与状态管理由 hook 托管。
- transport 抽象与上游流式链路决策同构：前端消费的是自家 Route Handler，协议转换收敛在 Next 加工层一处。
- 渲染组件可复用 shadcn/ui 体系，不引入第二套视觉风格。

### 负面

- 引入一套 UI 消息协议心智，团队需熟悉 message parts 模型。
- Next 加工层承担 Agent Service 事件流到 UI 消息协议的转换，是自维护的适配代码。

### 风险

- AI SDK API 迭代极快，随包文档纪律必须长期执行，否则代码会静默腐化到废弃 API 上。
- major 升级节奏快，需在依赖监听中关注 AI SDK 的破坏性变更通告。

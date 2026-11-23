---
title: "Design: AXY-25 陪伴闲聊伙伴"
description: AXY-25 的架构设计(总览/非目标/UI/错误边界/需求承载;数据与契约、测试接缝、ADR 关系拆出)
sidebar_position: 2
---

# Design: AXY-25 陪伴闲聊伙伴

| 对应 Proposal | [AXY-25](/product/AXY-25-chat-companion/proposal) | 状态   | 已批准（批准人：海渝，2026-11-23） |
| ------------- | ------------------------------------------------- | ------ | ---- |
| 日期          | 2026-11-23                                        | 批准人 | 海渝 |

> 本文件为 design 主文件，**唯一批准状态真源**；拆出文件（[contracts](/dev/AXY-25-chat-companion/contracts) / [testing](/dev/AXY-25-chat-companion/testing) / [adr](/dev/AXY-25-chat-companion/adr)）头部不另设状态列。

## 架构总览

前端 `useChat`（AI SDK，transport 指向自有 `POST /api/chat`）→ Route Handler 鉴权 + F-01 校验 → `modules/chat` 落库用户消息 → `src/agent` 按 `trigger` 分支转发 agent-service（AgentScope 2.0.12 Agent Service，compose 内网）→ SSE 会话事件流经 `transform` 重组为 UIMessage 流回写 writer → 前端打字机渲染；流正常完成后加工层落库伙伴消息，失败不落库、走重试（AC6）。历史首屏 RSC 直读 `getRecentMessages` 下行 props。长期记忆经 Mem0Middleware 落自有 PostgreSQL（mem0 pgvector，ADR-0032）；python 服务代码落顶层 `agent-service/`（评审 #89），会话记录用 AgentScope 内建 storage（同实例 PG 独立表）。

## 选型记录

| # | 决策点 | 候选 | 裁定 | 落选理由 |
| - | ------ | ---- | ---- | -------- |
| 1 | AI 服务框架 | AgentScope 2.0 / Pydantic AI / OpenAI Agents SDK / LangGraph | 沿用 ADR-0029（AgentScope 2.0） | 选型已由 ADR 承载，本设计不重开 |
| 2 | 流式链路协议 | SSE 全链 / WebSocket / gRPC | 沿用 ADR-0030（SSE 全链） | 同上 |
| 3 | AI UI 层 | AI SDK / assistant-ui / AgentScope 配套前端 / 自研 hook | 沿用 ADR-0031（AI SDK） | 同上 |
| 4 | python 服务落点 | 顶层 `agent-service/` / `services/agent/` / 顶层 `python/` | 沿用架构评审 #89（`agent-service/`） | 同上 |
| 5 | 模块边界（TS 侧） | A. chat 模块 + agent 子系统；B. 全收进 modules/chat | A（开发者选定） | B：AI 协议适配与业务域耦合，第二个 AI 特性出现时被迫拆分 |
| 6 | 消息持久化归属 | A. Next 独占写聊天表；B. Agent Service 直写；C. 不建聊天表复用 AgentScope 会话存储 | A（开发者选定） | B：双属主交叉写同一表，Drizzle 迁移与 python 写入互相牵制；C：UI 历史可用性绑死 python 服务，持久事实背离既有缓存纪律精神 |
| 7 | 长期记忆 | A. Mem0 OSS + pgvector；B. ReMe + pgvector 透传；C. 文件式 AgenticMemory；D. 自建 pgvector 中间件 | A（开发者选定，承载于 ADR-0032） | B：第三方链 + open 缺陷，一等程度低于 Mem0 官方 pgvector 后端；C：不满足开发者三条硬约束（多副本一致/SQL 可查/不新增备份面）；D：违背开箱即用偏好 |
| 8 | 布局轮（4 演示态） | A. 引用 `workbench-layout`；B. layout-upgrade 调整块内比例 | A（开发者选定） | B：条目块内比例与演示态需求一致，无需升级 |
| 9 | 组件轮（聊天面板） | A. component-draft 新建 chat-panel 条目；B. 豁免 · shadcn 组装文字定义 | A（开发者选定） | B：流式渲染/气泡排布/重试态是新交互形态，文字契约让视觉效果回到想象 |

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置（不覆盖/不引入的概念） |
| ----------------- | ---- | ---------------------------------- |
| 1 | 记忆管理界面（查看/编辑/删除记忆） | 不覆盖：无记忆读取 UI，mem0 表不进业务 queries；不引入记忆实体界面字段 |
| 2 | 伙伴主动发起对话（推送） | 不覆盖：无通知通道、无服务端主动触达路径；chat 流仅由用户输入触发 |
| 3 | 语音与图片消息 | 不覆盖：消息为纯文本 `content`，无 DataBlock/音频链路；input 仅 text |
| 4 | 人设与称呼自定义 | 不覆盖：system_prompt 为服务端固定配置，无用户设置项、无配置端点 |
| 5 | 多会话与「开启新对话」 | 不覆盖：无 chats 表、无 session 切换 UI；每用户单 session 由 ensureCompanionSession 幂等维持 |
| 6 | 记忆重置 /「重新认识我」 | 不覆盖：无记忆清空端点与入口 |

## UI 与组件

1. **路由/页面**：无新增路由。伙伴面板为工作台页 `(app)/workbench` 的内嵌区域（proposal 裁定 D-04）；无视图切换。
2. **布局处置与组件树**：
   - 布局轮：4 个演示态全部引用 `studybuddyui/layouts/workbench-layout`（截图为视觉真源：顶部栏 + AI 伙伴 8:4 + 日历入口）；聊天面板落在「AI 伙伴」块内；
   - 组件树（自上而下）：
     - `ChatPanel`（**Client**，状态机：`useChat` 承载流状态与重试编排，状态本地）——划分理由：聊天域无任何既有组件或草稿条目（已盘点 `src/components/` 与 `studybuddyui/components/`，均为日历/搜索/成就域）；流式渲染、气泡排布、重试态是新交互形态，shadcn 原子件（button/textarea）只够控件粒度；150 行红线预判：编排 + useChat 接线 ≤ 120 行；
       - `MessageList`（Client，组合）：消息数组 → 气泡列表，滚动锚定最新消息；
       - `MessageBubble`（Client，纯展示）：单条消息渲染，流式 text part 逐字呈现，失败态呈现 E-02 与重试按钮；≤ 80 行；
       - `ChatInput`（Client，组合）：textarea + 发送钮，F-01 校验与 E-01 提示，生成中置灰；≤ 100 行；
   - 组件轮裁定：新建条目 `studybuddyui/components/chat-panel`（经 component-draft 产出并归档，双气泡式——对比候选 B 无框文档流被否：框感与对话边界感胜出），映射落点 `src/modules/chat/components/`（ChatPanel.tsx 及子组件）；
     状态清单（取条目全状态陈列）：交互演示（默认对话中可输入/发送/流式）、生成中·流式（发送钮置灰 + 流式光标）、失败·重试（E-02 + 重试按钮）、空态·迎接、超长文本自动换行、交互态标注（发送钮默认/Hover/Active/Disabled、输入框聚焦）；动效规格已随条目 prompt.md 归档（消息进入 250ms ease-out、光标 900ms 循环、失败反馈 200ms、reduced-motion 降级齐全）；
   - 全部新增文件落点在代码目录清单内：`modules/chat/*`（垂直切片形状）+ `src/agent/*`（AI 子系统占位）+ `src/app/api/chat/route.ts`（api 目录既有形状）+ 顶层 `agent-service/`（评审 #89）。
3. **表单与交互状态**：
   - F-01 落点：前端 `ChatInput` textarea `maxLength=2000` + 字数计数；校验函数 `sendMessageSchema`（zod）前后端共用——前端 onChange 即时校验，后端 Route Handler 400 兜底；空内容发送钮置灰，无文案；
   - E-01 呈现：输入框下方（ChatInput 内），修改输入内容后即消；
   - E-02 呈现：失败消息气泡位（MessageBubble），旁附重试按钮，点击走 `regenerate()`（trigger = regenerate-message）；
   - 生成中（useChat status = submitted/streaming）：发送钮置灰、输入框可继续打字（D-09）——状态归属 ChatPanel；
4. **演示态 ↔ AC 映射**（与 proposal 演示态清单一一对应）：

| 演示态 | 对应 AC | 布局处置 |
| ------ | ------- | -------- |
| 1 工作台伙伴面板 · 对话进行中 | AC-1、AC-4 | 引用 workbench-layout |
| 2 隔天回访 · 主动续上 | AC-2、AC-3 | 引用 workbench-layout |
| 3 新用户首聊空态 | AC-5 | 引用 workbench-layout |
| 4 回复失败 · 重试 | AC-6 | 引用 workbench-layout |

5. **守卫归属**：Server 层——`(app)/layout.tsx` 既有服务端守卫（`auth.api.getSession`），未登录 redirect 登录页；`POST /api/chat` 二次鉴权（401 判别联合）；Client 无守卫逻辑。

## 错误与边界处理

**表一 · proposal 边界表对应**

| proposal 边界项 | 处理方式 | 落点（组件/函数） |
| --------------- | -------- | ----------------- |
| 1 输入长度（F-01） | 前端 maxLength + zod 即时校验；后端 400 判别联合兜底 | ChatInput / sendMessageSchema / route.ts |
| 2 生成中继续操作 | 发送钮置灰至回复完成或失败，输入框可打字（D-09） | ChatPanel（useChat status） |
| 3 会话过期时发送 | POST 401 → 前端 clearError 并跳登录页（沿用既有守卫语义） | route.ts / ChatPanel |
| 4 与既有特性交互 | 面板为工作台新增区域，照 workbench-layout 条目组装，不动日历等功能 | WorkbenchPage 组装层 |

**表二 · E 表映射**

| E 编号 | 产出函数/组件 | 呈现位置 | 关联 R |
| ------ | ------------- | -------- | ------ |
| E-01 | ChatInput 校验提示 | 输入框下方，修改输入即消 | R7 |
| E-02 | `agentEventToUIMessageChunk` error chunk → MessageBubble 失败态 | 失败消息气泡位，旁附重试按钮 | R6 |

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | -------- |
| R1 | ChatPanel useChat 流式渲染 + POST /api/chat + runCompanionTurn 全链 | 集成：POST /api/chat 流序列断言（start→text-delta…→finish→[DONE]） |
| R2 | agent-service 记忆链（Mem0Middleware pgvector）+ 人设 system_prompt（design 不定文案，实现期定稿） | 人工抽检：隔天回访 ≥ 10 组 |
| R3 | chat_message 表 + getRecentMessages + useChat({ messages }) 首屏 | 单元：getRecentMessages 升序映射；人工抽检：换设备 |
| R4 | 人设 system_prompt 情绪优先指令（与 R2 同载体） | 人工抽检：吐槽场景 ≥ 10 组 |
| R5 | getRecentMessages 返回 [] → ChatPanel 空态迎接语（伙伴第一条消息） | E2E：空态首聊旅程 |
| R6 | trigger = regenerate-message 分支 + saveUserMessage 去重 + transform error chunk（E-02） | 单元：transform/saveUserMessage；E2E：失败重试旅程 |
| R7 | sendMessageSchema（F-01）+ E-01 | 单元：validators 边界取值 |

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---------- | ---- |
| 1 | AgentScope `ChatModelConfig.type` 确切取值（源码无静态枚举） | 不阻塞设计——适配隔离在 src/agent/client.ts | 实现期首个任务经 `GET /credential/schemas` 运行时核验后定稿 |
| 2 | `ensureCompanionSession` 幂等检索的端点组合（GET /agent/ 按 name 过滤的参数形态） | 不阻塞设计——失败路径有 error chunk 兜底 | 实现期以 2.0.12 实例实测核验后定稿 |
| 3 | 智谱 Embedding-3 的 base_url 与 dimensions 取值（ADR-0032 已定承载路径，端点常量未实测） | 不阻塞设计——适配隔离在 agent-service 服务工厂配置内 | 已闭合（2026-11-23）：本地环境变量已配置智谱与 DeepSeek API key（开发者批准时确认，机密不进仓库）；base_url 与 dimensions 实现期随服务配置实测定稿 |

## 拆出文件索引

| 拆出文件 | 内容 | 模板与合格判据 |
| -------- | ---- | -------------- |
| [contracts.md](/dev/AXY-25-chat-companion/contracts) | 数据模型与契约（含路由行为落点表） | templates/contracts.md |
| [testing.md](/dev/AXY-25-chat-companion/testing) | 测试接缝（TDD red 阶段直接输入） | templates/testing.md |
| [adr.md](/dev/AXY-25-chat-companion/adr) | 与 ADR 的关系（一页纸）+ Q 条目去向 | templates/adr.md |

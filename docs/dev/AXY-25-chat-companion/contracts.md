---
title: "Design: AXY-25 陪伴闲聊伙伴 · 数据与契约"
description: AXY-25 的数据模型与契约(签名级,含路由行为落点表)
sidebar_position: 3
---

# Design: AXY-25 陪伴闲聊伙伴 · 数据与契约

> 本文件为 design 的拆出节，批准状态以 [design.md](design) 头部表为准，不另设状态列。

## 数据模型

单实体 `chat_message`（proposal 领域模型「消息」的持久化形态）。**无 chats 表**：单线对话（proposal 负空间，D-05）下每用户一条时间线，无需会话维度。**无 status 列**：伙伴消息失败不落库（前端临时态 + 重试重生成），库内消息只有「已完成」一种存在形态。

迁移归属：drizzle-kit 生成 SQL 入库评审（迁移纪律按现行约定）；表属主为 `src/modules/chat/schema.ts`，经 `src/db/schema.ts` barrel re-export；无种子数据。

| 实体 | 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| chat_message | id | text | primaryKey | 复用 UI 消息 id：user 消息 id 由前端生成、assistant 消息 id 由加工层生成；重试时同 id 冲突即去重（AC6 语义） |
| chat_message | userId | text | notNull | Better Auth user.id，记忆与消息都跟账号走（AC3） |
| chat_message | role | text | notNull | 取值 `'user' \| 'assistant'`，应用层枚举校验 |
| chat_message | content | text | notNull | 纯文本消息正文（v1 闲聊为纯文本，不存 parts 结构） |
| chat_message | createdAt | timestamp({ withTimezone: true }) | notNull, defaultNow | 排序键 |

索引：`chat_message_user_created` on `(userId, createdAt)`——历史查询主路径。

状态转换表（库内口径，与 proposal 领域模型「消息」状态流转一致）：

| 起始态 | 触发 | 目标态 | 关联 |
| ------ | ---- | ------ | ---- |
| （无行） | 消息已发送（trigger = submit-message，F-01 校验通过） | user 行落库 | R1 |
| （无行） | 回复已完成（REPLY_END 且 finished_reason = completed） | assistant 行落库 | R1 |
| （无行） | 回复失败（finished_reason ≠ completed 或连接中断） | 不落库——失败是前端临时态，重试重新生成 | R6 |

python 侧（agent-service）自有存储与记忆不在本表内：agent/credential/session 记录由 AgentScope 内建 storage 承载（PostgreSQL 经 AsyncSQLAlchemyStorage，与业务库同实例、独立表，框架自动建表）；长期记忆经 Mem0Middleware 落同实例 PostgreSQL（mem0 pgvector 向量库 + history，ADR-0032），mem0 自管其表结构、不进业务迁移体系。

## 契约

TS 侧签名（跨模块/跨层接口与需单测的核心函数）；python 侧为 AgentScope Agent Service 既有 REST 面，本设计只登记消费方式不自建协议。

```ts
// ── src/modules/chat/schema.ts（表契约见上节）──

// ── src/modules/chat/validators.ts ──
/** F-01 单一真源：消息正文 1–2000 字。违反时 zod 失败，Route Handler 返回 400 判别联合。 */
export const sendMessageSchema = z.object({ text: z.string().min(1).max(2000) });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ── src/modules/chat/queries.ts ──
/** RSC 直读（工作台 page 调用）：返回按 createdAt 升序的 UIMessage[]，供 useChat({ messages }) 首屏。 */
export async function getRecentMessages(userId: string, limit?: number): Promise<UIMessage[]>;

// ── src/modules/chat/service.ts ──
/** 落库用户消息。id 冲突时静默跳过（ON CONFLICT DO NOTHING）——重试不产生重复行（AC6）。 */
export async function saveUserMessage(input: { id: string; userId: string; content: string }): Promise<void>;
/** 落库伙伴消息。仅在流正常完成时调用；失败路径不落库。 */
export async function saveAssistantMessage(input: { id: string; userId: string; content: string }): Promise<void>;

// ── src/agent/client.ts（agent-service REST 客户端，全部请求带 X-User-ID 头）──
/** 幂等确保该用户存在「陪伴伙伴」agent、模型凭据与会话：按固定 name/三元组检索，缺失则经 REST 创建；返回既有映射。 */
export async function ensureCompanionSession(
  userId: string,
): Promise<{ agentId: string; sessionId: string }>;
/** 发送一轮用户输入（POST /chat/，fire-and-forget）：事件不在此响应，一律经 openSessionStream 消费。 */
export async function sendChatMessage(
  userId: string, agentId: string, sessionId: string, text: string,
): Promise<void>;
/** 订阅会话 SSE 事件流（GET /sessions/{sessionId}/stream，fetch 流式读以携带身份头）。 */
export function openSessionStream(
  userId: string, agentId: string, sessionId: string, after?: string,
): ReadableStream<AgentEvent>;

// ── src/agent/protocol.ts（事件类型，对齐 AgentScope event 枚举）──
export type AgentEvent =
  | { type: "REPLY_START"; replyId: string }
  | { type: "TEXT_BLOCK_DELTA"; replyId: string; blockId: string; delta: string }
  | { type: "REPLY_END"; replyId: string; finishedReason: "completed" | "interrupted" | "exceed_max_iters" | "error"; error: unknown }
  | { type: string; [k: string]: unknown }; // 其余枚举按 AgentScope event 定义逐项登记，未消费事件静默跳过

// ── src/agent/transform.ts ──
/** AgentEvent → AI SDK UIMessageChunk：REPLY_START→start(+start-step)；TEXT_BLOCK_DELTA→text-delta；
 *  REPLY_END(completed)→finish；REPLY_END(非 completed)→error(errorText=E-02 文案)；未知事件→null。 */
export function agentEventToUIMessageChunk(event: AgentEvent, assistantId: string): UIMessageChunk | null;

// ── src/agent/stream.ts（加工编排，Route Handler 唯一入口）──
/** 一轮陪伴对话：ensureCompanionSession → openSessionStream → sendChatMessage →
 *  泵事件经 transform 写入 writer；流正常完成后 saveAssistantMessage。
 *  本函数不写 user 消息（归属 Route Handler 按 trigger 分支）。 */
export async function runCompanionTurn(opts: {
  userId: string;
  userText: string;
  writer: UIMessageStreamWriter;
}): Promise<void>;

// ── src/app/api/chat/route.ts ──
/** POST：getCurrentSession 鉴权（401 判别联合）→ F-01 校验（400）→
 *  trigger = 'submit-message'：saveUserMessage（取最后一条 user UIMessage 的 id 与 text）；
 *  trigger = 'regenerate-message'：不落库直接重生成；
 *  → createUIMessageStream({ execute }) 内调 runCompanionTurn → createUIMessageStreamResponse 返回
 *  （SSE 头 x-vercel-ai-ui-message-stream: v1 / x-accel-buffering: no 由官方 helper 设置）。 */
export async function POST(request: Request): Promise<Response>;
```

| 契约 | 调用方 | 被调方 | 错误情形 |
| ---- | ------ | ------ | -------- |
| `getRecentMessages` | 工作台 page（RSC） | modules/chat queries | DB 异常上抛 → 工作台错误态 |
| `saveUserMessage` | Route Handler | modules/chat service | id 冲突静默去重；DB 异常 → 500 判别联合 |
| `saveAssistantMessage` | runCompanionTurn | modules/chat service | 仅 completed 调用；DB 异常记日志不影响已下发流 |
| `ensureCompanionSession` | runCompanionTurn | src/agent → agent-service | REST 5xx/网络错 → error chunk（E-02） |
| `sendChatMessage` | runCompanionTurn | agent-service POST /chat/ | 同上 |
| `openSessionStream` | runCompanionTurn | agent-service GET stream | 流中断 → 本次失败（不落库），浏览器重试 |
| `agentEventToUIMessageChunk` | runCompanionTurn | src/agent 内部 | 未知事件返回 null（静默跳过），不抛错 |
| `POST /api/chat` | 前端 useChat transport | Route Handler | 401 未登录；400 超限（E-01 由前端校验拦截为主）；流内 error chunk（E-02） |

python 侧消费方式（AgentScope 2.0.12 既有 REST，不自建）：

| 端点 | 用途 | 关键事实 |
| ---- | ---- | -------- |
| `POST /agent/` `GET /agent/` | 幂等创建/按 name 检索伙伴 agent（system_prompt 人设） | 按 `X-User-ID` 隔离 |
| `POST /credential/` | 幂等创建 DeepSeek 凭据（api_key 经环境变量注入 agent-service） | 凭据为 per-user 资源 |
| `POST /sessions/` | 幂等创建会话（(user, agent, workspace) 三元组唯一 upsert） | chat_model_config 绑定 credential_id |
| `POST /chat/` | 发送一轮输入（fire-and-forget） | 响应不含事件 |
| `GET /sessions/{sid}/stream?after=` | SSE 事件流（`data: {json}\n\n`，30s 心跳注释帧） | `after` = messages 端点的 event_cursor，断线回放 |

## 路由行为落点表

proposal 路由行为表为「无新增」：守卫沿用 (app) 布局组服务端守卫（未登录 redirect 到登录页，Server 层），伙伴面板随工作台呈现，无独立路由与跳转。

| 路由行为 # | 实现位置 | 错误情形 |
| ---------- | -------- | -------- |
| 无新增 | (app)/layout.tsx 既有守卫；本特性不改 | — |

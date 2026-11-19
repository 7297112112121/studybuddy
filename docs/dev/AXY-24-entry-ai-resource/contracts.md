---
title: 'Design: AXY-24 条目 AI 资料提案 · 数据与契约'
description: 条目 AI 资料提案的数据模型与契约(签名级,含路由行为落点表)
sidebar_position: 3
---

# Design: AXY-24 条目 AI 资料提案 · 数据与契约

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 数据模型

关系:`calendar_entry`(AXY-22,1)──(N)`entry_resource`(本特性新增,条目附属)。`calendar_entry` 表零改动(非目标 #3)。

| 实体 | 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| entry_resource | id | uuid | PK,`defaultRandom()` | |
| entry_resource | entryId | uuid | NOT NULL,FK → `calendar_entry.id` ON DELETE CASCADE | 同模块引用,建 DB 级 FK(AXY-22 不建 FK 的裁决仅针对跨模块 auth 引用);条目删除即资料消失(proposal 领域模型口径) |
| entry_resource | title | text | NOT NULL | 资料标题,1—50 字(F-04;应用层校验,DB 不限) |
| entry_resource | url | text | NOT NULL | 资料 URL,F-05:合法 `http(s)://`,写入前经来源集校验 |
| entry_resource | createdAt | timestamp(with tz) | NOT NULL,`defaultNow()` | |

索引:`entry_resource_entry_id` ON (`entry_id`)。账号隔离无需独立列——资料随条目,隔离由 entry 的 user_id 归属传导(R11),读取路径一律经条目归属校验。

迁移归属:`src/db/migrations/<UTC时间戳>_axy24-entry-resource/`,经 `npm run db:generate` 生成入库评审(ADR-0006);表定义属主 `src/modules/calendar/schema.ts`,`src/db/schema.ts` barrel re-export(先例口径)。

提案为**界面临时态,无表**(D-13):提案数据只存在于 `ProposalDialog` 本地 state 与请求往返中,状态流转(生成中 → 待确认 → 已确认/已放弃)是客户端行为,不落库;确认写入后的持久化产物只有 `calendar_entry` 行 + `entry_resource` 行。

种子数据:无。路径常量:无新增路由,`ROUTES` 零改动。i18n:新文案 key 挂 `calendar` 命名空间 `calendar.proposal.*`(key 清单在实现计划登记,句式文案与 proposal E 表逐字对应)。

状态转换表(提案·界面临时态,与 proposal 领域模型口径一致):

| 起始态 | 触发 | 目标态 | 关联 |
| ---- | ---- | ---- | ---- |
| 生成中 | 呈现「正在生成提案…」,发起禁用 | 待确认 | AI 成功返回(R2/R10) |
| 生成中 | 用户关闭浮层 | (销毁,无痕) | R10 |
| 待确认 | 点「确认写入」 | 已确认 | R4/R12(事务成功) |
| 待确认 | 关闭浮层 / 全部删光后确认 | (销毁,无痕) | R4/D-13 |
| 待确认 | 再次发起 | 待确认(新提案整体替换) | R9 |

## 契约

只覆盖跨模块 / 跨层接口与需单测的核心函数;`ProposalDialog` 内部渲染逻辑不写契约。

```ts
// ── agent/prompts/chains/entry-intent.ts ─────────────────────────────
// 意图判定 chain(纯函数,零 IO):从条目文字 + 可选追问答复产出意图
export const ENTRY_INTENT_PROMPT_VERSION = "v1";
export type EntryIntentInput = {
  entryTitle: string;          // 条目文字原文(F-01 AXY-22,≤50 字)
  userRangeHint: string | null; // 追问答复原文(F-01 AXY-24,1—200 字;未追问为 null)
  today: string;               // "YYYY-MM-DD",服务端当日(范围解析的参照系)
};
export const entryIntentOutputSchema = z.object({
  verdict: z.enum(["APPLICABLE", "NEEDS_RANGE", "NOT_APPLICABLE"]),
  notApplicableReason: z.string().max(200).nullable(), // verdict=NOT_APPLICABLE 时必填
  rangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), // 自由文字解析出的范围,含今天起算的默认(如无范围由编排层不进入检索)
  rangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  searchQuery: z.string().min(1).max(100), // 给检索调用的建议查询词
});
export function chainEntryIntent(input: EntryIntentInput): {
  messages: ModelMessage[];
};

// ── agent/prompts/chains/resource-plan.ts ────────────────────────────
// 提案生成 chain(纯函数):从条目 + 范围 + 检索来源集产出结构化提案
export const RESOURCE_PLAN_PROMPT_VERSION = "v1";
export type ResourcePlanInput = {
  entryTitle: string;
  rangeStart: string; // "YYYY-MM-DD"(来自意图判定,必填——NEEDS_RANGE 已在编排层消化)
  rangeEnd: string;
  today: string;
  sources: WebSearchSource[]; // 检索调用返回的来源集(唯一合法 URL 池)
};
export const resourcePlanOutputSchema = z.object({
  verdict: z.enum(["PLAN", "NOT_FOUND"]),
  notFoundReason: z.string().max(200).nullable(), // verdict=NOT_FOUND 时必填
  days: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    text: z.string().min(1).max(50), // F-02,生成即满足
    resources: z.array(z.object({
      title: z.string().min(1).max(50), // F-04
      url: z.string().url(), // F-05;编排层再校验 ∈ sources
    })).min(1),
  })),
});
export function chainResourcePlan(input: ResourcePlanInput): {
  messages: ModelMessage[];
};

// ── agent/runtime/deepseek-web-search.ts ─────────────────────────────
// DeepSeek 检索调用封装(ADR-0028 逃生舱:直连 HTTP,零业务知识;
// 输入只认 messages,输出只含文本与来源,无业务概念)
export type WebSearchSource = {
  url: string;
  title: string | null;
  snippet: string | null;
};
export type WebSearchCompletion =
  | { ok: true; text: string; sources: WebSearchSource[] }
  | { ok: false; error: "AI_UNAVAILABLE" }; // 网络 / 5xx / 响应体 error 块(官方「生成失败」条款:200 + error 亦归此)
export async function runWebSearchCompletion(
  messages: ModelMessage[],
): Promise<WebSearchCompletion>;
// 实现:POST https://api.deepseek.com/chat/completions,Bearer DEEPSEEK_API_KEY,
// model=deepseek-flash,tools=[{type:"deepseek_web_search"}],response_format 省略
// (声明联网工具时禁结构化输出,ADR-0028);来源从 message.server_tool_calls
// 的 search 调用 sources 与 annotations.url_citation 聚合去重。

// ── calendar/proposal.ts(service 层编排)──────────────────────────────
export type ProposalResource = { title: string; url: string };
export type ProposalDay = {
  date: string; // "YYYY-MM-DD",∈ [rangeStart, rangeEnd]
  text: string; // 1—50 字
  resources: ProposalResource[]; // ≥1,url ∈ 检索来源集(代码不变量)
};
export type EntryProposal =
  | { kind: "PLAN"; days: ProposalDay[] }
  | { kind: "NEEDS_RANGE" } // 意图判定需要追问,编排层不进入检索
  | { kind: "NEEDS_RANGE_INCOMPREHENSIBLE" } // 已追问答复仍解析不出范围 → E-06
  | { kind: "NOT_APPLICABLE"; reason: string } // E-02,理由为模型原文
  | { kind: "NOT_FOUND"; reason: string }; // E-03:检索零来源 / 规划 NOT_FOUND / 过滤后空
export async function requestEntryProposal(
  userId: string, // 恒取自会话,不收客户端传入(R11)
  entryId: string,
  userRangeAnswer: string | null, // 追问答复(F-01);首轮为 null
): Promise<EntryProposal>; // 查询带 userId 条件,条目不存在/不属该用户 → throw EntryNotFoundError(action 归一 NOT_FOUND);AI 层失败 throw AiUnavailableError(action 归一 AI_UNAVAILABLE)
// 编排:意图判定(generateObject + entryIntentOutputSchema,经 agent 公共 API)
//   → APPLICABLE:检索(runWebSearchCompletion)→ 规划(generateObject +
//   resourcePlanOutputSchema)→ 业务过滤(日期 ∈ 范围、按天去重、截断至范围
//   天数、URL ∈ 来源集、title/text 长度)→ 空则 NOT_FOUND
//   → NEEDS_RANGE 且 userRangeAnswer ≠ null:带 hint 重判一次,仍解析不出
//   范围 → NEEDS_RANGE_INCOMPREHENSIBLE(不重试,开放问题 #2)

export type ConfirmedProposal = {
  entryId: string; // 来源条目(校验归属;原条目保持不变)
  days: ProposalDay[]; // ≥1(全部删光由客户端视为放弃,不发请求)
};
export async function confirmEntryProposal(
  userId: string,
  proposal: ConfirmedProposal,
): Promise<boolean>; // false = 来源条目不存在或不属该用户;成功 = 单事务写入:
// 对每个 day:INSERT calendar_entry(标题=day.text,日期=day.date,时间均 null,
// 复用 calendarEntryInputSchema 校验)→ INSERT 其 entry_resource 行。
// 任一步失败整体回滚(D-12 整单原子);写入后由调用方 revalidatePath。

// ── calendar/actions.ts(新增两个 Server Action,判别联合)──────────────
export type ProposalActionResult =
  | { ok: true; proposal: EntryProposal }
  | { ok: false; error: "UNAUTHORIZED" }        // 无会话 → 客户端跳 /login
  | { ok: false; error: "NOT_FOUND" }           // 条目不存在或不属该用户
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: { answer?: string } } // F-01 违反 → E-01
  | { ok: false; error: "AI_UNAVAILABLE" };     // E-04
export async function requestProposalAction(
  entryId: string,
  userRangeAnswer: string | null,
): Promise<ProposalActionResult>;

export type ProposalWriteResult =
  | { ok: true }
  | { ok: false; error: "UNAUTHORIZED" }
  | { ok: false; error: "NOT_FOUND" }   // 来源条目不属该用户
  | { ok: false; error: "INVALID_INPUT" } // ConfirmedProposal zod 违反(客户端兜底失守时)
  | { ok: false; error: "WRITE_FAILED" }; // E-05(含事务失败)
export async function confirmProposalAction(
  proposal: ConfirmedProposal,
): Promise<ProposalWriteResult>;
```

| 契约 | 调用方 | 被调方 | 错误情形 |
| ---- | ---- | ---- | ---- |
| `chainEntryIntent` / `chainResourcePlan` | `calendar/proposal.ts` | `agent/prompts`(纯函数) | 不抛错(纯函数,IO 错误在被调 generateObject 层) |
| `generateObject`(agent 公共 API) | `calendar/proposal.ts` | `agent/runtime` | 网络 / 5xx / schema 违反 → throw,编排层转 `AiUnavailableError` |
| `runWebSearchCompletion` | `calendar/proposal.ts` | `agent/runtime`(直连 DeepSeek) | 判别联合 `AI_UNAVAILABLE`,不抛 |
| `requestEntryProposal` | `calendar/actions.ts` | `calendar/proposal.ts` | throw `EntryNotFoundError` / `AiUnavailableError`,action 归一 |
| `confirmEntryProposal` | `calendar/actions.ts` | `calendar/proposal.ts` | 事务失败 throw → action 归一 `WRITE_FAILED` |
| `requestProposalAction` / `confirmProposalAction` | `EntryRow` / `WeekEntryDialog` / `ProposalDialog`(Client) | `calendar/actions.ts` | 判别联合,渲染映射见 design 错误表二 |

### 路由行为落点表

proposal 路由行为表为「无新增路由」:无页面级守卫/跳转落点;会话守卫沿用 `src/app/(app)/layout.tsx` `AppLayout`(既有,零改动),action 层 `UNAUTHORIZED` 沿用 `runAction` 归一流。本特性无路由行为实现项。

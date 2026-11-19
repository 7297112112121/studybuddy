# AXY-24 条目 AI 资料提案 实现计划

**Goal:** 在日程条目上发起「帮我找资料」,DeepSeek 检索 + 两段式生成按天提案清单,确认后整单原子写入日程并留存资料

**Date:** 2026-11-19

**Tier:** 严格 —— 跨模块(calendar + agent 子系统)、含迁移(entry_resource)、含 E2E(5 演示态)、首个 AI 特性

**Spec:** docs/product/AXY-24-entry-ai-resource/proposal.md(仅追溯指针,不要求读取)
**Design:** docs/dev/AXY-24-entry-ai-resource/(design.md + contracts / testing / adr,唯一信息来源)

## Global Constraints

1. TDD 铁律:无先失败的测试即无产品代码;集成/E2E 为显式任务先红后绿
2. ADR-0028:检索调用 POST `https://api.deepseek.com/chat/completions`,`model: "deepseek-flash"`,`tools: [{type:"deepseek_web_search"}]`,**不带 response_format**;Bearer `DEEPSEEK_API_KEY`;200+error 块 / 5xx / 网络异常一律归一 `AI_UNAVAILABLE`,不抛裸异常
3. ADR-0028 两段式:意图判定与提案生成走 `generateStructured`(generateObject + zod,不带工具);提案资料 URL 必须 ∈ 检索来源集(代码过滤不变量)
4. ADR-0025:Server Actions 判别联合返回,不抛裸异常;ADR-0010:错误返回 i18n key 不返文案原文,E-02/E-03 的 AI 理由原文作数据拼接
5. 账号隔离:userId 恒取自 `getCurrentSession()`(`@/modules/auth`),不收客户端传入;service/查询恒带 userId 条件(R11)
6. 整单原子(D-12):确认写入单 `db.transaction`,失败零残留
7. ADR-0006:迁移经 `npm run db:generate` 生成,禁手改 SQL
8. i18n 新 key 挂 `src/locales/zh-CN/calendar.json` 的 `proposal.*` 子命名空间;`tests/i18n/messages.test.ts` 保持绿
9. 提案为界面临时态:不落库、不入 zustand,只存 ProposalDialog 本地 state(D-13)
10. 导入走深路径(calendar 无 index.ts barrel,现状约定);`src/agent/` 为全新目录,禁 import `modules/` / `app/`(代码目录禁止清单 #1)
11. E2E stub 门控:`DEEPSEEK_STUB_FIXTURE=1` 显式设置才启用,开关代码限 `src/agent/runtime/` 单文件,生产默认关(design 开放问题 #1 假设)
12. 检索零来源不自动重试 → NOT_FOUND(design 开放问题 #2 假设)
13. 依赖:先装 `@ai-sdk/deepseek`,实测 `generateObject` 不通则换 `@ai-sdk/openai-compatible`(baseURL `https://api.deepseek.com`),裁决入档
14. 全量套件基线:`npm run lint && npm run type-check && npm run test && npm run test:integration && npm run test:e2e` 全绿才算任务收口(E2E 仅 T8/T9/T10 跑)
15. Q1–Q4 性能验证由测试提质阶段验收,本计划不安排验证任务

## 不安排任务

| design 非目标 # | 刻意不做 | 理由 |
| ---- | ---- | ---- |
| 1 | 对话式 AI 助手入口 | 唯一入口是条目级动作;不建输入框入口/会话实体/`/api/chat` 挂接 |
| 2 | AI 自动发起 | 发起仅由用户点击触发;不建定时任务/轮询/推送 |
| 3 | 跨度条目数据模型 | `calendar_entry` 表零改动;范围仅存于编排内存数据 |
| 4 | 资料收藏/评分/学习进度 | `entry_resource` 无评分/收藏/状态列(唯一状态「已留存」) |
| 5 | AI 服务配置界面 | 模型标识与密钥只来自服务端 env,无用户可见配置面 |
| 6 | 资料沉淀进知识库/RAG | `entry_resource` 纯 URL 挂载,无分块/嵌入/pgvector 写入,`agent/rag` 不动 |
| 7 | Q1–Q4 性能验证 | 测试提质阶段验收(Global Constraint 15) |

## Review Focus

1. **runWebSearchCompletion 错误归一**:DeepSeek 生成失败时 HTTP 200 + 响应体 error 块(官方文档明载),漏判 = 假成功 → 固定于 T3 fetch mock 用例「200+error 块归一 AI_UNAVAILABLE」
2. **整单原子性**:第二条目写入失败必须零残留 → 固定于 T5 集成用例「事务注入失败零残留」
3. **来源集 URL 过滤不变量**:提案 URL ∉ 检索来源集必须整条剔除(Q3 可达率机制) → 固定于 T4 `filterPlanDays` 用例
4. **越权不泄漏存在性**:乙会话请求甲条目须 NOT_FOUND 且与「条目不存在」不可区分 → 固定于 T5 双账号用例
5. **stub 泄漏面**:`DEEPSEEK_STUB_FIXTURE` 未设时 stub 必须不可达(否则生产构建带测试后门) → 固定于 T3 开关默认关闭用例 + T8 E2E 独立用例

## 执行纪律(全局声明一次,任务卡不重复)

每个任务默认按 TDD 六步执行:

1. **写失败测试**(测试名与断言见任务卡「失败测试」行,spec 的精确值写在测试里);
2. **运行测试,确认以「预期失败」所述方式失败**;
3. **在「实现」落点完成最小实现**;
4. **运行测试,确认通过**;
5. **运行全量测试套件,确认全绿**(单元任务跑 `npm run test`;集成任务加跑 `npm run test:integration`;E2E 任务跑 `npm run test:e2e`);
6. **按「提交」信息提交**。

测试原始输出重定向 `docs/dev/AXY-24-entry-ai-resource/evidence/`,只回读汇总行。

## 任务

### Task 1: entry_resource 表与级联迁移

**Files:** Modify `src/modules/calendar/schema.ts` · Modify `src/db/schema.ts`(barrel 加 export) · Create `src/db/migrations/<UTC时间戳>_axy24_entry_resource/`(经 db:generate) · Test `tests/integration/calendar/entry-resource-schema.test.ts`

**Interfaces:** Produces `entryResource` 表(id uuid PK defaultRandom / entryId uuid NOT NULL FK→calendar_entry.id ON DELETE CASCADE / title text NOT NULL / url text NOT NULL / createdAt timestamptz defaultNow)+ 索引 `entry_resource_entry_id` ON (entry_id);barrel re-export(供 T3 无关、T5/T7 import)

**AC / 演示态:** 无(集成)

**失败测试:** 「entry_resource 表/索引/FK 存在且随条目级联删除」——查 information_schema.tables/columns/indexes/constraints 断言齐全;插入条目+资料→删条目→资料行消失。迁移前跑红:表不存在断言失败

**预期失败:** information_schema 查无 `entry_resource` 表,断言 FAIL

**实现:** `schema.ts` 加 `entryResource` 表定义(同模块 FK 建约束,AXY-22 不建 FK 裁决仅针对跨模块 auth 引用;snake_case.table 烘焙口径与先例一致)→ `npm run db:generate` → `npm run db:migrate`

**提交:** `feat(calendar): entry_resource 表与级联迁移`

### Task 2: agent chains(纯函数)

**Files:** Create `src/agent/prompts/chains/entry-intent.ts`、`src/agent/prompts/chains/resource-plan.ts` · Test `tests/agent/chains/entry-intent.test.ts`、`tests/agent/chains/resource-plan.test.ts`

**Interfaces:** Produces(签名抄自 design contracts,后续 T4 消费):`ENTRY_INTENT_PROMPT_VERSION="v1"`、`entryIntentOutputSchema`(verdict 三分支枚举 APPLICABLE/NEEDS_RANGE/NOT_APPLICABLE + notApplicableReason ≤200 nullable + rangeStart/rangeEnd `YYYY-MM-DD` nullable + searchQuery 1–100)、`chainEntryIntent(input: {entryTitle, userRangeHint: string|null, today}): {messages: ModelMessage[]}`;`RESOURCE_PLAN_PROMPT_VERSION="v1"`、`resourcePlanOutputSchema`(verdict PLAN/NOT_FOUND + notFoundReason + days[{date, text 1–50, resources[{title 1–50, url}]} ≥1])、`chainResourcePlan(input: {entryTitle, rangeStart, rangeEnd, today, sources})`。错误情形:纯函数不抛错

**AC / 演示态:** 无(单元)

**失败测试:** 「chainEntryIntent messages 含条目原文/追问答复/今日参照」「chainResourcePlan messages 含范围与来源集 URL 清单」「schema 拒绝 reason 缺失的 NOT_APPLICABLE / resources 空的 day / 51 字 text」

**预期失败:** 模块不存在,import 失败 FAIL

**实现:** prompts 三件套形状(版本常量 + zod schema + messages 构造纯函数,零 IO,`import type { ModelMessage } from "ai"`)

**提交:** `feat(agent): 资料提案意图判定与规划 chain`

### Task 3: agent runtime(模型注册 + 检索封装 + stub 门控)

**Files:** Create `src/agent/runtime/deepseek-model.ts`、`src/agent/runtime/deepseek-web-search.ts` · Modify `package.json`(装 `@ai-sdk/deepseek`) · Test `tests/agent/runtime/deepseek-model.test.ts`、`tests/agent/runtime/deepseek-web-search.test.ts`

**Interfaces:** Produces(T4 消费):`chatModel(): LanguageModel`(读 `DEEPSEEK_API_KEY`,缺失 throw);`generateStructured({schema, messages}): Promise<{ok:true; object} | {ok:false; error:"AI_UNAVAILABLE"}>`(ai generateObject 包装,异常归一不抛);`runWebSearchCompletion(messages): Promise<WebSearchCompletion>`(`{ok:true; text; sources:{url,title,snippet}[]} | {ok:false; error:"AI_UNAVAILABLE"}`,Global Constraint 2 请求形态;来源从 `message.server_tool_calls[].calls[].sources` 与 `message.annotations[].url_citation` 聚合按 URL 去重);stub fixture(env `DEEPSEEK_STUB_FIXTURE=1` 时优先返回,按 messages 关键词:含「买牛奶」→notApplicable 语料、含「触发AI故障」→AI_UNAVAILABLE、无日期且无「追问答复:」标记→needsRange 语料、其余→固定 PLAN 语料,来源集给 3 条固定 URL)

**AC / 演示态:** 无(单元)

**失败测试:** 「请求体含 deepseek_flash 与 deepseek_web_search 声明且无 response_format」「200+error 块→AI_UNAVAILABLE」(Review Focus 1)「5xx / fetch reject→AI_UNAVAILABLE」「server_tool_calls 与 url_citation 聚合按 URL 去重」「DEEPSEEK_STUB_FIXTURE 未设时不得走 stub 分支」(Review Focus 5)「chatModel 缺 env throw」

**预期失败:** 模块不存在 import 失败 FAIL

**实现:** Global Constraint 2/11 原样;`generateStructured` 内 `generateObject({model: chatModel(), schema, messages})` try/catch 归一

**提交:** `feat(agent): DeepSeek 模型注册与检索调用封装(含 E2E stub 门控)`

### Task 4: calendar 提案编排

**Files:** Create `src/modules/calendar/proposal.ts` · Test `tests/calendar/proposal.test.ts`

**Interfaces:** Consumes `generateStructured` / `runWebSearchCompletion`(T3)、两 chain(T2)、`entryResource` 不涉及。Produces(T5/T6 消费):`filterPlanDays(plan: {verdict, days}, rangeStart, rangeEnd, sources: WebSearchSource[]): ProposalDay[]`(纯函数);`EntryProposal` 判别联合(`PLAN{days}` / `NEEDS_RANGE` / `NEEDS_RANGE_INCOMPREHENSIBLE` / `NOT_APPLICABLE{reason}` / `NOT_FOUND{reason}`);`requestEntryProposal(userId, entryId, userRangeAnswer: string|null): Promise<EntryProposal>`,错误情形:条目不存在或不属该用户 throw `EntryNotFoundError`;AI 层失败 throw `AiUnavailableError`

**AC / 演示态:** 无(单元,承载 R2/R3 结构)

**失败测试:** 「日期越界剔除」「同日去重保留首条」「超范围天数截断」「URL∉来源集整条剔除」(Review Focus 3)「过滤后空→NOT_FOUND」「APPLICABLE 走检索+规划全链」「检索零来源→NOT_FOUND 不重试」(Constraint 12)「NEEDS_RANGE+答复重判出 PLAN」「答复仍无范围→NEEDS_RANGE_INCOMPREHENSIBLE」「NOT_APPLICABLE 直返含理由」

**预期失败:** 模块不存在 import 失败 FAIL

**实现:** 编排调 `db` 读条目(userId+id 条件);mock 边界在 `@/agent/runtime/deepseek-model` 与 `@/agent/runtime/deepseek-web-search` 两个模块

**提交:** `feat(calendar): AI 资料提案编排与来源集过滤`

### Task 5: 确认写入事务 + Server Actions + 错误 key

**Files:** Modify `src/modules/calendar/proposal.ts`(加 confirmEntryProposal) · Modify `src/modules/calendar/actions.ts` · Modify `src/locales/zh-CN/calendar.json`(error keys) · Test `tests/integration/calendar/proposal-write.test.ts`

**Interfaces:** Consumes T1 表、T4 类型。Produces(T6/T7 消费):`confirmEntryProposal(userId, {entryId, days: ProposalDay[]}): Promise<boolean>`(单事务逐 day INSERT calendarEntry(title=text/entryDate=date/时间均 null,复用 calendarEntryInputSchema 校验)→ INSERT entryResource;失败 throw 由 action 捕获);`requestProposalAction(entryId, userRangeAnswer): Promise<ProposalActionResult>`(`{ok:true;proposal}` / UNAUTHORIZED / NOT_FOUND / `{ok:false;error:"INVALID_INPUT";fieldErrors:{answer?:string}}`(answer key=`calendar.proposal.answerRequired`) / AI_UNAVAILABLE);`confirmProposalAction(proposal): Promise<ProposalWriteResult>`(ok / UNAUTHORIZED / NOT_FOUND / INVALID_INPUT / WRITE_FAILED);成功后 `revalidatePath(ROUTES.calendar)`

**AC / 演示态:** 无(集成,承载 R4/R5/R11/R12 结构)

**失败测试:** 「事务注入失败(第二条目)零残留」(Review Focus 2)「乙会话请求甲 entryId 两 action 均 NOT_FOUND 且与不存在同形」(Review Focus 4)「F-01 留空→INVALID_INPUT.fieldErrors.answer」「成功路径 N 条目+M 资料落库且归属正确」「来源条目校验失败→NOT_FOUND/WRITE_FAILED」

**预期失败:** confirmEntryProposal/requestProposalAction 不存在,import/断言 FAIL

**实现:** `db.transaction` 包多条写;actions 走 `getCurrentSession` 归一流,`confirmedProposalSchema` zod 复验(days ≥1、date 合法、text 1–50、url http(s)、每 day resources ≥1)

**提交:** `feat(calendar): 提案确认写入事务与 Server Actions`

### Task 6: ProposalDialog 组件

**Files:** Create `src/modules/calendar/components/ProposalDialog.tsx` · Modify `src/locales/zh-CN/calendar.json`(proposal.* 文案 keys) · Test `tests/calendar/components/ProposalDialog.test.tsx`

**Interfaces:** Consumes T5 两 action(深路径 mock)。Produces(T7 消费):`ProposalDialogProps = {entryId: string; entryTitle: string; onClose: () => void}`——挂载即 idle,内部状态机 idle→loading→needRange/plan/notApplicable/notFound/unavailable→(plan 确认)writing→成功 onClose;plan 行内删改文字(F-02 maxLength=50)与日期(F-03 date 控件)、整条删除;重新生成=再次调 requestProposalAction 整体替换(R9);关闭浮层丢弃全部本地态(R10/D-13)

**AC / 演示态:** 演示态 1–5 的浮层交互本体(E2E 在 T8/T9)

**失败测试:** 「各 kind 渲染与文案(清单/追问/不适用/没找到含理由/不可用+重试)」「F-01 maxLength=200、留空禁提交、E-01/E-06 呈现追问输入框下方」「生成中『正在生成提案…』且不可重复发起」「行内删改更新本地态」「全部删光确认=放弃不发请求」「确认写入中置灰,WRITE_FAILED 呈 E-05 且提案保留可重试」「重试=重新发起」

**预期失败:** ProposalDialog 不存在,渲染断言 FAIL

**实现:** 复用 shadcn Dialog/Input/Label/Button;NextIntlClientProvider 真实 messages,沿 DayPanel.test 模式(mock actions + next/navigation)

**提交:** `feat(calendar): 提案浮层 ProposalDialog`

### Task 7: 资料展示 + 两处发起入口

**Files:** Modify `src/modules/calendar/components/EntryRow.tsx`、`DayPanel.tsx`、`WeekEntryDialog.tsx`、`WeekView.tsx`、`CalendarScreen.tsx`、`src/modules/calendar/queries.ts`(加 listEntryResources) · Test 更新 `tests/calendar/components/EntryRow.test.tsx`(无则新建)、`DayPanel.test.tsx`、`WeekView.test.tsx`

**Interfaces:** Consumes T1 表、T6 ProposalDialog、T5 无新。Produces:`EntryRowProps = {entry, onEdit, onAssist}`(onAssist 可选,传入才渲染按钮);`listEntryResources(userId, dates: string[]): Promise<Map<string, {title: string; url: string}[]>>`(join calendarEntry 恒带 userId 条件,entryId 分组);CalendarScreen 调用并经 props 合并给 DayPanel;WeekEntryDialog 编辑态 footer 加发起动作(onAssist 回调),创建态不出现;资料行渲染为链接(target=_blank,rel=noopener,F-05)

**AC / 演示态:** 演示态 1(入口)/ 3(资料展示)的结构承载,E2E 在 T8/T9

**失败测试:** 「EntryRow 传 onAssist 渲染『帮我找资料』且点击触发」「EntryRow 有资料渲染标题链接 target=_blank」「DayPanel 集成资源展示」「WeekEntryDialog 编辑态出现发起动作、创建态不出现」「listEntryResources 仅回本人条目资料」

**预期失败:** onAssist/listEntryResources 不存在,断言 FAIL

**实现:** 资料展示仅在月视图当日详情(演示态 3 场景);AXY-22/23 既有测试保持绿

**提交:** `feat(calendar): 条目发起入口与已留存资料展示`

### Task 8: E2E stub 接入 + 月视图主旅程

**Files:** Modify `playwright.config.ts`(webServer env 注入 `DEEPSEEK_STUB_FIXTURE: "1"`) · Create `e2e/entry-resource.spec.ts` · Helper 复用 `e2e/helpers/auth.ts`

**Interfaces:** Consumes T6/T7 全部 UI。Produces:无(末端)

**AC / 演示态:** AC-1/AC-2/AC-3(演示态 1、3)+ R9/R10

**失败测试:** 「发起→按天清单且日程零新增」「删 2 改 1 确认→仅剩余条目落各自日期、原条目不变」「点开条目见资料行」「二次发起清单替换」「生成中禁重复、关闭重开为初始态」「生产构建未注入 env 时 stub 语义不出现」(独立用例,Review Focus 5)。stub 语料:标题含「学习next框架 11.20–11.30」→ 3 天 PLAN(11-20/11-21/11-22 各一条,资料 URL 来自固定来源集)

**预期失败:** 前端无发起入口/浮层,E2E 断言 FAIL

**实现:** 仅测试侧;按 stub 语料写断言(结构+行为口径,design 边界 #6)

**提交:** `test(e2e): 提案月视图主旅程与重新生成`

### Task 9: E2E 周视图 + 追问 + 边界态

**Files:** Modify `e2e/entry-resource.spec.ts`(续)

**Interfaces:** Consumes T8 stub 接入。Produces:无

**AC / 演示态:** AC-4/AC-5/AC-6(演示态 4、5)+ 演示态 2(专态)+ AC-1 周视图入口 + R3/R12

**失败测试:** 「周视图色块编辑卡发起→同一浮层」「无范围条目→追问→答复『到月底』出清单、无效答复→没看懂提示可再答」「买牛奶→不适用提示、日程零变化」「没找到→含理由提示」「触发AI故障→不可用提示,重试后出清单」「confirm action 路由 abort→写入失败提示且浮层保留可重试」

**预期失败:** 追问/边界态 UI 缺失,断言 FAIL

**实现:** 仅测试侧;E-05 用 `page.route` 拦 next-action POST abort(沿 calendar.spec.ts 先例)

**提交:** `test(e2e): 提案追问与边界态旅程`

### Task 10: 全量回归收口

**Files:** Modify `docs/dev/代码目录.md`(落地现状速查:src/agent/ 落地、calendar 无 barrel 事实) · `AGENTS.md` 若被 next dev 改写随提交

**Interfaces:** 无

**AC / 演示态:** 无

**失败测试:** 无(收口任务,六步退化为:全量套件确认全绿)

**预期失败:** 无

**实现:** `npm run lint && npm run type-check && npm run lint:circular && npm run lint:unused && npm run test && npm run test:integration && npm run test:e2e` 全绿;速查表补两行(src/agent/ 落地现状、calendar 模块无 barrel 深路径约定)

**提交:** `chore: AXY-24 实现收口——全量回归与文档快照修订`

## 执行链

| 链 | 任务序列 | 文件域 | 并行性 |
| ---- | ---- | ---- | ---- |
| 链1 | Task 2→3 | src/agent/**、tests/agent/**、package.json | 与链2并行(文件域不相交) |
| 链2 | Task 1 | calendar/schema.ts、db/schema.ts、migrations、entry-resource-schema.test | 与链1并行 |
| 链3 | Task 4→5 | calendar/proposal.ts、actions.ts、locale(error keys)、tests/integration/calendar | 链1+链2完成后串行 |
| 链4 | Task 6→7 | calendar/components/**、queries.ts、locale(proposal.* keys) | 链3完成后;与链5不可并行(locale 共享) |
| 链5 | Task 8→9→10 | e2e/**、playwright.config.ts、docs/dev/代码目录.md | 链4完成后串行 |

单链为主如实声明:T1 ∥ (T2→T3) 起步两链并行,其余链间 Produces/Consumes 相接,串行执行;不硬造并行。

## 裁决记录

裁决: T1∥(T2→T3)两并行链改内联串行执行 — 同工作区双代理并发跑 `npm install` 与 git commit 存在 index.lock / node_modules 竞争,隔离收益(墙钟)小于事故风险 — 代价:执行墙钟变求和。
裁决: 新增第三 chain `resource-search`(T4 范围内)— design 只定义了两 chain,检索调用的 messages 构造无承载,prompts 三件套按「每任务一文件」补齐 — 代价:多一份提示词文件与 2 个测试用例。
裁决: T3 `generateObject` 泛型入参实测改为类型面验证(ai@7.0.177 + @ai-sdk/deepseek@3.0.88 安装成功、generateObject 契约编译通过) — 无 DEEPSEEK_API_KEY 无法真实出网实测,真实调用面留给测试提质阶段 — 代价:provider 运行时兼容性延后确认。
裁决: T8「stub 泄漏面」E2E 独立用例取消,由 T3 单测(env 未设 stub 不可达)+ webServer env 注入承载 — 双环境双构建跑两套 E2E 成本过高 — 代价:泄漏面由单测与配置注释守护,E2E 不重复覆盖。
裁决: T8 stub 语料由固定日期改为服务端「今天」偏移动态生成,E2E 断言用同款 offset — 固定日期的断言随真实日历漂移(跨月即红) — 代价:stub 与 E2E 各自实现 offset 计算需保持同构。
裁决: T9 stub 意图路由收紧——日期样 token 只认点号形态、答复「随便」判 NEEDS_RANGE — 横杠今日行被误命中致全部条目判 APPLICABLE;「随便」需表达不可理解分支 — 代价:stub 路由依赖测试条目关键词约定(已写进 fixture 头注)。
裁决: T10 收口期发现 AXY-22 calendar.spec R3 在本分支确定性级别波动(~1/3→处理后 ~1/6),master 基线 3/3 全绿 — 签名为 Radix 确认层自发性 onOpenChange(false) + action 按钮 detach 翻转;已做两项缓解:ProposalDialog 改 next/dynamic 按需加载(主路由 chunk 恢复基线体量,兼兑现 Q4)、R3 第二次开层补 toBeVisible 等待 — 代价:未定位到根因(排除 SSR 水合竞态/连续重渲染源/串行查询拖迟),残余波动由 CI retries=2 兜底;建议 spec-review 后单独立测试稳定性任务跟进。

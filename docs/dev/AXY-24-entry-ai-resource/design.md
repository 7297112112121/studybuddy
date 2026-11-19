---
title: 'Design: AXY-24 条目 AI 资料提案'
description: 条目 AI 资料提案的架构设计(总览/非目标/UI/错误边界/需求承载;数据与契约、测试接缝、ADR 关系拆出)
sidebar_position: 2
---

# Design: AXY-24 条目 AI 资料提案

| 对应 Proposal | [AXY-24](/product/AXY-24-entry-ai-resource/proposal) | 状态 | 已批准(批准人:海渝,2026-11-19) |
| ---- | ---- | ---- | ---- |
| 日期 | 2026-11-19 | 批准人 | 海渝 |

> 本文件为 design 主文件,**唯一批准状态真源**;拆出文件([contracts](/dev/AXY-24-entry-ai-resource/contracts) / [testing](/dev/AXY-24-entry-ai-resource/testing) / [adr](/dev/AXY-24-entry-ai-resource/adr))头部不另设状态列。

## 架构总览

实现路径分两条腿:**agent 子系统首次落地**(AI 调用,零业务知识)+ **calendar 模块扩展**(资料项数据与提案编排,持有全部业务知识)。

- **agent 腿**:`agent/runtime` 新增 DeepSeek 检索调用封装(直连 HTTP,ADR-0028 逃生舱,返回判别联合);`agent/prompts/chains` 新增两个 chain 纯函数(意图判定 `entry-intent` / 提案生成 `resource-plan`,prompts 三件套形状)。LLM 调用形态两段式:检索调用(带 `deepseek_web_search`,自由文本)与结构化调用(`generateObject`,不带工具)分离——DeepSeek 声明联网工具时禁结构化输出,故必须分离。
- **calendar 腿**:`calendar/proposal.ts`(service 层编排:意图 → 检索 → 规划,业务过滤规则在此)调 agent 公共 API;`calendar/schema.ts` 增 `entry_resource` 表(条目附属,同模块 FK + 级联删除);`calendar/actions.ts` 增两个 Server Action(判别联合,ADR-0025 基线流);确认写入为单模块 `db.transaction`(条目 + 资料整单原子,D-12)。
- **UI 腿**:发起动作挂 `EntryRow`(月视图)与 `WeekEntryDialog`(周视图);新 `ProposalDialog` 客户端浮层持有提案临时态(D-13:界面临时态,本地 state,不入 zustand、不落库)。

关键取舍:AI 编排放 calendar 模块而非新模块——资料项是条目附属实体(D-10),跨模块拆分只会把「确认写入」逼上 app 层双模块编排(代码目录轴 1 阶段 2),无业务收益;agent 侧不建 tool-loop agent,检索走单轮调用——本特性无多步工具编排需求(ADR-0014 LangChain 否决理由同样适用)。

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置(不覆盖/不引入的概念) |
| ---- | ---- | ---- |
| 1 | 对话式 AI 助手入口 | 不覆盖:唯一入口是条目级「帮我找资料」动作;不引入输入框入口、无会话实体、无 `/api/chat` 挂接 |
| 2 | AI 自动发起 | 不覆盖:发起仅由用户点击触发;不引入定时任务、轮询或服务端主动推送 |
| 3 | 「从哪天到哪天」跨度条目数据模型 | 不覆盖:`calendar_entry` 表零改动(不新增 start/end 日期列);范围仅存在于提案编排的内存数据 |
| 4 | 资料收藏 / 评分 / 学习进度跟踪 | 不覆盖:`entry_resource` 表无评分 / 收藏 / 状态列(唯一状态「已留存」);不引入进度实体 |
| 5 | AI 服务配置界面 | 不覆盖:模型标识与密钥只来自服务端 env(`DEEPSEEK_API_KEY`);不引入任何用户可见配置面 |
| 6 | 资料沉淀进个人知识库 / RAG | 不覆盖:`entry_resource` 是纯 URL 挂载,无分块 / 嵌入 / pgvector 写入;`agent/rag` 不动 |

## UI 与组件

1. **路由/页面**(含视图切换):无新路由。挂点两处——月视图 `/calendar` 的 `DayPanel` 条目行、周视图 `WeekEntryDialog` 编辑卡(D-06);提案浮层为页内 Dialog,不产生路由变化;月 / 周视图切换沿用 AXY-23 既有机制。
2. **组件树与既有组件复用关系**:
   - `CalendarScreen`(Server,RSC)→ `DayPanel`(Client)→ `EntryRow`(Client,**加「帮我找资料」动作**)→ 新 `ProposalDialog`(Client,浮层持有提案本地态);
   - `WeekView`(Client)→ `WeekEntryDialog`(Client,**加「帮我找资料」动作**,与编辑表单并列)→ 同一 `ProposalDialog`(经 props/回调由 WeekView 挂载);
   - 复用 shadcn/ui:`Dialog`(浮层壳)、`Input`、`Label`、`Button`(ADR-0004);纯色品牌主按钮沿用 AXY-22 先例(禁渐变,ADR-0027 深空语义 token)。
3. **表单与交互状态**:
   - F-01 追问答复:前端半边 `Input` + `maxLength=200` + 留空禁提交(`ProposalDialog`);后端半边 `followUpAnswerSchema` zod 在 `requestProposalAction` 复验;E-01 / E-06 呈现于追问输入框下方;
   - F-02 提案文字编辑:前端半边 `Input` + `maxLength=50`(每条提案项);后端半边 `confirmedDaySchema` zod(1—50 字);F-03 日期:前端 `date` 控件,后端 `isValidDateString` 校验;
   - F-04 / F-05 资料字段:无用户输入,AI 生成侧约束——`resourcePlanOutputSchema` 约束生成,`requestEntryProposal` 代码层过滤(URL ∈ 检索来源集 / title 1—50 字),`confirmedDaySchema` 后端兜底;
   - 提交中状态:生成中「正在生成提案…」(`R10`)与写入中「确认写入」置灰均归 `ProposalDialog` 本地 state;错误呈现位置逐项映射见错误与边界处理表二。
4. **演示态 ↔ AC 映射**(与 proposal 14.1 一一对应):演示态 1 发起与提案清单(含重新生成)→ AC-1;演示态 2 追问(演示专态,WF·R3)→ 无 AC;演示态 3 删改确认与资料留存 → AC-2、AC-3;演示态 4 不适用与没找到 → AC-4、AC-5;演示态 5 服务不可用与重试 → AC-6。
5. **守卫归属**:无新守卫;`/calendar` 未登录拦截沿用 `src/app/(app)/layout.tsx` 的 `AppLayout`(Server,服务端拦截);两个新 action 的 `UNAUTHORIZED` 归一流沿用 `calendar/actions.ts` 既有 `runAction` 模式,客户端 `router.replace(ROUTES.login)` 沿用 `EntryForm` 先例。

## 错误与边界处理

**表一 · proposal 边界表对应**

| proposal 边界项 | 处理方式 | 落点(组件/函数) |
| ---- | ---- | ---- |
| 1 | AI 从自由文字理解意图与范围,不保证精确解析;偏差由确认环节兜底(每条可删改) | `resource-plan` chain 产出 → `requestEntryProposal` 过滤 → `ProposalDialog` 删改(R4) |
| 2 | 提案条目写入沿用 AXY-22 全部字段规则,默认不带钟点(开始 / 结束均为 null) | `confirmEntryProposal` 组装 `CalendarEntryInput` 走既有 `createEntry` 路径,`calendarEntryInputSchema` 复验 |
| 3 | 每天最多一条、条目数 ≤ 范围天数;范围内含过去日期允许 | `requestEntryProposal` 代码层:按日期去重、截断至范围天数、非法日期剔除;全被剔除 → 归一 NOT_FOUND |
| 4 | 提案日期以确认时为准,写入条目与手写条目并列展示、无差别标记 | `entry_resource` 纯数据挂载,日历展示层(AXY-22/23 组件)零改动 |
| 5 | 整单原子(D-12):全成或全败,失败零新增、提案保留 | `confirmEntryProposal` 用 `db.transaction` 写条目 + 资料;action 捕获异常归一 WRITE_FAILED |
| 6 | AI 生成不确定:断言只约束结构与行为,E2E 以测试替身固定输出 | `agent/runtime` 检索调用 env 门控 stub(`DEEPSEEK_STUB_FIXTURE`,仅测试环境);`generateObject` 单测 / 集成层以 vi.mock 固定 |
| 7 | 会话与守卫复用 AXY-8 底座,无新增路由 | `AppLayout` + `runAction` 归一流,userId 恒取自会话 |

**表二 · E 表映射**

| E 编号 | 产出函数/组件 | 呈现位置 | 关联 R |
| ---- | ---- | ---- | ---- |
| E-01 | `requestProposalAction`(INVALID_INPUT·追问)→ `ProposalDialog` | 追问输入框下方 | R3 |
| E-02 | `requestEntryProposal` 返回 `NOT_APPLICABLE`(含模型给出的理由,存 i18n key + 理由原文)→ `ProposalDialog` 提示区 | 浮层提示区 | R6 |
| E-03 | `requestEntryProposal` 返回 `NOT_FOUND`(含理由)→ `ProposalDialog` 提示区 | 浮层提示区 | R7 |
| E-04 | `requestEntryProposal` 返回编排错误 → action 归一 `AI_UNAVAILABLE` → `ProposalDialog` 提示区 + 重试按钮 | 浮层提示区 | R8 |
| E-05 | `confirmProposalAction` 返回 `WRITE_FAILED` → `ProposalDialog` 提示区 | 浮层提示区 | R12 |
| E-06 | `requestEntryProposal` 返回 `NEEDS_RANGE_INCOMPREHENSIBLE` → `ProposalDialog` 追问输入框下方 | 追问输入框下方 | R3 |

E-02/E-03 的理由为 AI 生成原文,只作正文拼接,不进 i18n key 体系(key 只承载固定句式,ADR-0010 口径不变)。

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | ---- |
| R1 | `EntryRow` 与 `WeekEntryDialog` 各加「帮我找资料」动作,挂载同一 `ProposalDialog` | E2E:`/calendar` 月视图点条目行动作 → 浮层出现;周视图色块编辑卡内动作 → 同一浮层;断言既有编辑行为不变(AXY-22/23 既有 E2E 回归) |
| R2 | `requestProposalAction` → `requestEntryProposal`(意图 `entry-intent` chain + `runWebSearchCompletion` + `resource-plan` chain)→ `ProposalDialog` 清单渲染 | 单元:`resource-plan` 输出过滤函数(超天数截断 / 去重 / URL ∈ 来源集);E2E(stub):对「学习next框架 11.20–11.30」发起 → 浮层出现日期落在范围的多条提案,`/calendar` 无新增 |
| R3 | `requestEntryProposal` 意图判定返回 `NEEDS_RANGE` → `ProposalDialog` 追问视图;答复作 `userRangeAnswer` 重入 | 单元:意图 schema 三分支;E2E(stub):无范围条目 → 先见追问,答复后出清单 |
| R4 | `ProposalDialog` 行内删改(本地态)+ `confirmProposalAction` → `confirmEntryProposal` 事务 | E2E(stub):删 2 条改 1 条确认 → 日历只出现剩余条目、原条目不变;月 / 周视图一致 |
| R5 | `entry_resource` 表随条目写入;`listEntryResources` 查询供条目详情展示 | 集成:写入后按 entryId 查回资料行;E2E:确认后点开条目资料可见、URL 可点击 |
| R6 | 意图判定 `NOT_APPLICABLE` 分支 → `ProposalDialog` 呈现 E-02 | E2E(stub):「买牛奶」→ 呈现不适用提示、无清单、日程零变化 |
| R7 | 检索调用无来源或规划 `NOT_FOUND` → `EntryProposal { kind: "NOT_FOUND", reason }` → E-03 | E2E(stub):stub 返回无来源 → 呈现含理由的没找到提示 |
| R8 | `runWebSearchCompletion` / `generateObject` 异常 → action 归一 `AI_UNAVAILABLE` → E-04 + 重试 | 单元:编排错误传播;E2E:stub 故障态 → E-04 呈现,恢复后重试出清单 |
| R9 | 重新发起 = 再次调 `requestProposalAction`,`ProposalDialog` 以新响应整体替换本地提案态 | E2E(stub):同一条目二次发起 → 清单被替换、日程仍零新增 |
| R10 | `ProposalDialog` 生成中态(「正在生成提案…」+ 发起按钮禁用);关闭浮层 → 本地提案态丢弃 | 组件单测:生成中重复触发无效;E2E:关闭后重开为初始态 |
| R11 | 两个新 action 走 `runAction` 归一流,userId 恒取自会话;service 两函数首参均带 userId 且查询恒带 userId 条件 | 集成:账号乙会话调甲条目的 `requestProposalAction` / `confirmProposalAction` → `NOT_FOUND`(不泄漏存在性) |
| R12 | `confirmEntryProposal` 单事务写 N 条目 + M 资料 | 集成:注入第二条目写入失败 → 断言零残留(无条目、无资料);E2E:故障注入 → E-05、浮层保留可重试 |

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---- | ---- |
| 1 | E2E 的 AI 替身注入面(`DEEPSEEK_STUB_FIXTURE` env 门控 stub)在产品代码中留测试后门的边界 | 不阻塞设计与 TDD(单测 / 集成用 vi.mock,不依赖 stub);只影响 E2E 实现细节 | 声明假设:stub 仅在 env 显式设置时启用、生产构建默认关闭、开关代码限于 `agent/runtime` 单文件;plan 期细化注入面与守卫 |
| 2 | 检索调用「模型不搜」(返回零来源)是否自动重试一次 | 不阻塞:首版按「零来源 → NOT_FOUND(E-03)」处理,不重试 | 声明假设:不自动重试,人工重新发起即重试(与 R8/R9 同径);Q1 观察期后再评估 |
| 3 | `@ai-sdk/deepseek` 对 `generateObject` 的 json mode 支持面 | 不阻塞:备用面为 `@ai-sdk/openai-compatible`(ADR-0028 已记录);只影响 provider 包安装与版本 | 待定稿(plan 期安装验证,以实测为准) |

## 拆出文件索引

| 拆出文件 | 内容 | 模板与合格判据 |
| ---- | ---- | ---- |
| [contracts.md](/dev/AXY-24-entry-ai-resource/contracts) | 数据模型与契约(含路由行为落点表) | templates/contracts.md |
| [testing.md](/dev/AXY-24-entry-ai-resource/testing) | 测试接缝(TDD red 阶段直接输入) | templates/testing.md |
| [adr.md](/dev/AXY-24-entry-ai-resource/adr) | 与 ADR 的关系(一页纸)+ Q 条目去向 | templates/adr.md |

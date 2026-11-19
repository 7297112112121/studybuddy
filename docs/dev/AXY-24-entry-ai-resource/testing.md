---
title: 'Design: AXY-24 条目 AI 资料提案 · 测试接缝'
description: 条目 AI 资料提案的测试接缝(TDD red 阶段的直接输入)
sidebar_position: 4
---

# Design: AXY-24 条目 AI 资料提案 · 测试接缝

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 测试接缝

覆盖 proposal R 表全部测试层。AI 替身策略分层:单元 / 集成用 `vi.mock`(mock `agent/runtime` 与 `generateObject`);E2E 用 `DEEPSEEK_STUB_FIXTURE` env 门控 stub(Playwright webServer env 注入,开放问题 #1 假设边界)。组织沿用先例:单元 `tests/calendar/` 与 `tests/agent/`,集成 `tests/integration/calendar/`,E2E `e2e/`。

| 测试层 | 接缝(函数/路由/接口) | 断言要点 | 关联 R |
| ---- | ---- | ---- | ---- |
| 单元 | `chainEntryIntent` / `chainResourcePlan`(纯函数,`tests/agent/chains/`) | 给定输入 → messages 结构与提示词要点(条目原文、范围、来源集注入、当日参照系);schema 常量与版本号导出存在 | R2、R3 |
| 单元 | `entryIntentOutputSchema` / `resourcePlanOutputSchema`(zod) | 三分支 verdict 约束;NOT_APPLICABLE/NOT_FOUND 时 reason 必填;day.text 1—50、url 合法、resources ≥1 | R2 |
| 单元 | `requestEntryProposal` 业务过滤(mock agent 两层调用,`tests/calendar/proposal.test.ts`) | 日期越界剔除、同日去重、超范围天数截断、资源 URL ∉ 来源集整条剔除、全空 → NOT_FOUND;NEEDS_RANGE + 答复重入路径;答复不可理解 → NEEDS_RANGE_INCOMPREHENSIBLE | R2、R3 |
| 单元 | `runWebSearchCompletion`(fetch mock,`tests/agent/runtime/deepseek-web-search.test.ts`) | 请求体含 deepseek-flash 与 deepseek_web_search 声明、无 response_format;server_tool_calls/annotations → 来源聚合去重;200+error 块 / 5xx / 网络异常 → AI_UNAVAILABLE;env stub 开关默认关闭 | R2、R7、R8 |
| 单元 | `ProposalDialog`(组件,`tests/calendar/components/ProposalDialog.test.tsx`) | 各 kind 渲染:清单 / 追问 / 不适用 / 没找到 / 不可用+重试;F-01 maxLength=200 与留空禁提交;E-01/E-06 位置;生成中文案与发起禁用;行内删改更新本地态 | R3、R6—R10 |
| 集成 | `confirmEntryProposal`(真实 PG,`tests/integration/calendar/proposal.test.ts`) | 事务成功 → N 条目 + M 资料落库且归属 userId;注入失败(第二条目)→ 零残留(整单原子,R12);非法 ConfirmedProposal → false/异常;写入条目经 calendarEntryInputSchema(时间均为 null) | R4、R5、R12 |
| 集成 | `requestProposalAction` / `confirmProposalAction`(真实 PG/Redis,mock agent) | 越权:账号乙会话请求账号甲 entryId → NOT_FOUND(两 action);F-01 违反 → INVALID_INPUT.fieldErrors.answer;成功路径返回 EntryProposal / ok | R11 |
| 集成 | `listEntryResources` 按 entryId 读(真实 PG) | 仅回该条目资料;条目删除后资料行级联消失(CASCADE 生效) | R5 |
| E2E | `/calendar` 月视图旅程(stub 固定提案,`e2e/entry-resource.spec.ts`) | AC-1:条目行动作 → 浮层清单按天呈现、日程零新增;AC-2/3:删改确认 → 日历出现剩余条目、原条目不变、点开见资料;重新生成替换清单 | R1、R2、R4、R5、R9 |
| E2E | 周视图入口 + 追问旅程(stub) | AC-1 周视图:色块编辑卡动作 → 同一浮层;无范围条目 → 追问 → 答复 → 清单(R3);月/周数据一致 | R1、R3 |
| E2E | 边界态旅程(stub 故障态) | AC-4 不适用(买牛奶)、AC-5 没找到含理由、AC-6 不可用 + 重试恢复;关闭浮层日程不变 | R6、R7、R8、R10 |
| 人工抽检 | AI 服务真实调用(仅测试提质阶段,不进 CI) | Q3:真实检索调用 ≥ 20 条产出链接逐一可达性抽检,可达率 ≥ 90%;Q1 生成等待采样 | Q1、Q3 |

E2E stub 断言约束(design 边界 #6):全部 E2E 断言只针对「结构 + 行为」(按天、含资料、可删改、原条目不变),不针对 AI 具体文字与具体链接——stub 固定输出即测试的确定输入。

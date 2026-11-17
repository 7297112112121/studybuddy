---
title: 'Review: AXY-22 个人日程日历'
description: 个人日程日历的规范终审报告(判定/核对表/发现清单/裁决落实/性能与质量移交/证据附录)
sidebar_position: 4
---

# Review: AXY-22 个人日程日历

| 对应 Proposal | [proposal.md](../../product/AXY-22-study-calendar/proposal.md) | 状态 | 通过 |
| ---- | ---- | ---- | ---- |
| 审查日期 | 2026-11-18 | 审查人 | Claude(AI 终审)+ 海渝(人工验收 2026-11-18 通过) |

## 判定

**判定:** 通过 — 规范符合性四层(R 条目/规范细节/design 补强/非目标)全部 ✅,无证据不足项;代码质量无 Critical/Important 发现(无死代码、无 console 残留、无类型逃逸、无越界实现);仅 1 条 Minor(design 契约块 `.nullable()` 写法与 drizzle 1.0 RC 实际 API 不符,裁决已记但 design 未留指针),不阻塞通过。人工验收由提出者于 2026-11-18 确认通过。执行方式说明:实现、测试与终审在同一会话完成,全部套件当日新鲜运行、各任务先红后绿输出均落盘 evidence/,故终审采用内联执行(不分片派子代理),注入验证补做单元/集成两层各一项。

## 逐条核对表(R 条目层)

| 条目 | 核对内容 | 结果 | 证据 |
| ---- | ---- | ---- | ---- |
| R1 | EntryForm 带时间创建链路(createEntryAction→createEntry),revalidate 即时更新;E2E 创建「高数复习」14:00–15:30 断言详情与月格 | ✅ | e2e/calendar.spec.ts:80(R1);tests/integration/calendar/service.test.ts(正向建);evidence/t8-final-run.txt |
| R2 | 仅填文本创建(startTime/endTime 双 null),与带时间并存;E2E 断言无时间前缀且 2 行 | ✅ | e2e/calendar.spec.ts:97(R2);EntryForm.test.tsx ④'双 null 形态断言 |
| R3 | 编辑(EntryForm 复用/预填)与删除(AlertDialog 二次确认),变更即时生效;E2E 编辑即时更新/取消保留/确认消失 | ✅ | e2e/calendar.spec.ts:137(R3);DayPanel.test.tsx ④⑤⑥ |
| R4 | service 无重叠检查(边界 #3),同日 14:00–15:30 与 14:30–15:00 并存 | ✅ | tests/integration/calendar/service.test.ts(R4 重叠);e2e/calendar.spec.ts:208(R4 无冲突提示) |
| R5 | 过去日期可写可查(isValidDateString 无日期域限制);E2E 对昨日补记归入昨日 | ✅ | tests/calendar/schema.test.ts("2026-02-30"拒收/合法日通过);service.test.ts(R5 过去日期);e2e/calendar.spec.ts:172(R5) |
| R6 | listMonthEntries 以 userId 过滤仅本人;DayPanel 空态「这天还没有安排」 | ✅ | service.test.ts(R6/R7 隔离);DayPanel.test.tsx ①空态;e2e/calendar.spec.ts:80(R10+演示态 1) |
| R7 | 三层隔离:queries/service 全带 userId 条件;action 取会话 userId;update/delete WHERE 含 user_id | ✅ | service.test.ts(R7 越权 false)+actions.test.ts(④越权 NOT_FOUND);**注入验证**:漏 user_id 即红(evidence/inject-integration-red.txt) |
| R8 | 前后端共用 calendarEntryInputSchema;开始留空结束禁用 | ✅ | tests/calendar/schema.test.ts(26 例);EntryForm.test.tsx ①②③;e2e/calendar.spec.ts:113(R8);**注入验证**:refine 放宽即红(evidence/inject-unit-red.txt) |
| R9 | (app)/layout 既有守卫零新增,未登录重定向 /login | ✅ | src/app/(app)/layout.tsx(零改动,git diff 证实);e2e/calendar.spec.ts:73(R9) |
| R10 | workbench 新增「日程日历」入口,点击落 /calendar 当前月 | ✅ | src/app/(app)/workbench/page.tsx(Link,D-06 零改既有);e2e/calendar.spec.ts:80(R10+演示态 1) |
| R11 | 编辑改所属日期(input type=date),原日期消失新日期出现 | ✅ | e2e/calendar.spec.ts:222(R11);service.test.ts(updateEntry 正向改期断言) |
| R12 | isPending 置灰防重复提交;SAVE_FAILED → E-02 且原列表不变 | ✅ | EntryForm.test.tsx ⑥⑦⑦';e2e/calendar.spec.ts:249(R12 双击恰一条 + abort 呈 E-02 列表不变) |

## 规范细节核对表

| 编号 | 要求(逐字/逐项) | 实现落点 | 一致性证据 |
| ---- | ---- | ---- | ---- |
| F-01 | 必填 1—50 字,输入框 50 字硬上限,不做提交时字符过滤(D-07) | schema.ts min(1)/max(50);EntryForm.tsx maxLength={50},无字符过滤代码 | schema.test title 组(51 字拒/50 字过);留空 → E-01 |
| F-02 | `HH:MM` 分钟粒度 | TIME_HHMM_RE;EntryForm `<input type="time" step={60}>` | schema.test "00:00"/"23:59" 过,"24:00"/"7:00"/"14:0" 拒 |
| F-03 | 开始留空时结束禁用;须晚于开始;同属所选日期不跨午夜 | EntryForm disabled={startTime===""};schema refine#1/#2;零填充字符串比较,时间仅为日期内时刻 | EntryForm.test ③;schema.test refine 组;注入验证 1 |
| F-04 | 由选中天决定,编辑可修改(R11);过去/未来均可(AC-5) | page.tsx 所选日期;EntryForm 编辑模式 date 控件;isValidDateString 仅验真实日历日 | schema.test date 组;e2e R5/R11 |
| E-01 | 「请填写事项内容」表单文本字段下方 | calendar.json error.titleRequired(逐字);EntryForm title 字段下渲染 | messages.test 逐字断言;EntryForm.test ①;e2e R8 逐字 |
| E-02 | 「保存失败,请重试」表单提示区 | calendar.json(逐字);EntryForm role="alert" 提示区 | messages.test;EntryForm.test ⑦⑦';e2e R12 逐字 |
| E-03 | 「结束时间需晚于开始时间」结束时间字段下方 | calendar.json(逐字);EntryForm endTime 字段下渲染 | messages.test;EntryForm.test ②⑪;e2e R8 逐字 |
| 路由行为 #1 | 未登录访问 /calendar 重定向 /login,响应不携带日历内容 | (app)/layout.tsx AppLayout 既有 redirect(零改动);page.tsx 纵深防御同 workbench 先例 | e2e R9(未登录直达 → /login 且无「日程日历」文本) |
| 路由行为 #2 | 已登录工作台点入口 → /calendar 默认当前月、选中今天 | workbench/page.tsx `<Link href={ROUTES.calendar}>`;page.tsx 缺省/非法回退当前月 | e2e R10+演示态 1;Focus#3 非法 month 回退 |
| D-01 | 月视图 + 当日详情,不做周视图/双视图切换 | CalendarScreen 组装 MonthGrid+DayPanel,无视图切换代码 | grep 无 switch/视图切换态 |
| D-04 | 条目按账号隔离,共享/协作不设 | schema 无共享字段;queries/service 全带 userId | 非目标层 grep + R7 集成 |
| D-05 | 时间段可重叠不校验;过去日期可补记 | service.ts 无重叠检查代码;isValidDateString 无域限制 | service.test R4/R5 |
| D-06 | 工作台仅新增入口链接,不改 AXY-8 已批准行为 | workbench/page.tsx 仅追加 Link,既有 SignOutButton/标题零改动 | e2e auth 套件全量回归通过(t9-regression.txt 25 例) |
| D-08 | 删除须经二次确认,确认层无额外输入 | EntryRow AlertDialog;E2E 断言 dialog 内 input 计数 0 | e2e R3;DayPanel.test ④ |
| D-09 | 改期走编辑不做拖拽;完成打卡/多日历不设 | EntryForm 编辑模式 `<input type="date">`;无拖拽/打卡/日历实体代码 | grep 无 drag/complete/calendar 实体 |

## 契约一致性核对表

| 契约 | design 签名 | 实现签名 | 错误情形一致 | 结果 |
| ---- | ---- | ---- | ---- | ---- |
| MonthCell/buildMonthGrid/monthRange/addMonths/isValidDateString/formatHhmm | design「契约」month.ts 块 | src/modules/calendar/month.ts:29-99 逐字一致 | 不抛错,拒收由 isValidDateString/正则(T1 单测) | ✅ |
| calendarEntry 表 + TIME_HHMM_RE + calendarEntryInputSchema + CalendarEntryInput + CalendarFieldErrors | design「契约」schema.ts 块 | src/modules/calendar/schema.ts:32-79 一致;唯一偏离 `.nullable()` 链(1.0 RC 无此 API,裁决「T2 执行」已记) | E-01/E-03/防御键一致 | ✅ |
| CalendarEntryView + listMonthEntries | design「契约」queries.ts 块 | src/modules/calendar/queries.ts:19-60 一致 | DB 异常向上抛(无处理代码,裁决) | ✅ |
| createEntry/updateEntry/deleteEntry | design「契约」service.ts 块 | src/modules/calendar/service.ts:24-79 一致 | DB 异常抛出→SAVE_FAILED;false=未命中或不属该用户 | ✅ |
| CalendarEntryActionResult + 三 action | design「契约」actions.ts 块 | src/modules/calendar/actions.ts:29-108 一致 | 四种 ok:false 分支一致(INVALID_INPUT/UNAUTHORIZED/NOT_FOUND/SAVE_FAILED) | ✅ |

## 测试质量核对表

| R | 验收断言(逐项) | 测试名 | 断言覆盖 | 红绿确认方式 | 结果 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| R1 | 空日历选天创建「高数复习」14:00–15:30 → 该天展示「高数复习 14:00–15:30」 | e2e R1;EntryForm.test ④ | 覆盖(详情行 14:00–15:30 + 月格 14:00 高数复习 + 秒位不泄漏) | 附带失败输出(t8-first-run 6 failed→final 11 passed) | ✅ |
| R2 | 仅填「交英语作业」→ 落该天、无时间显示、与带时间并存 | e2e R2;EntryForm.test ④' | 覆盖(2 行并存 + 无时间前缀) | 附带失败输出(同上) | ✅ |
| R3 | 编辑文字/时间即时更新;删除二次确认后消失、取消保留 | e2e R3;DayPanel.test ④⑤⑥ | 覆盖(编辑/取消/确认/确认层无输入) | 附带失败输出(t8-second-run R3 红→修复→绿) | ✅ |
| R4 | 同天已有 14:00–15:30,再创建 14:30–15:00 → 两条并存、无冲突提示 | service.test R4;e2e R4 | 覆盖(集成写+查、E2E 无冲突文案) | 附带失败输出(evidence/t3-red.txt) | ✅ |
| R5 | 对 2026-11-16 创建 → 成功且归入 11-16 | service.test R5;e2e R5 | 覆盖(过去日写+查;E2E 相对昨日+月格摘要) | 附带失败输出(t3-red.txt) | ✅ |
| R6 | 甲查看无条目当天 → 空态呈现且无乙条目 | service.test R6/R7 隔离;DayPanel.test ①;e2e 演示态 1 | 覆盖 | 附带失败输出(t3-red.txt) | ✅ |
| R7 | 乙会话请求甲条目读写接口均被拒绝 | service.test R7;actions.test ④ | 覆盖(update/delete false→NOT_FOUND;查询不含) | **注入验证**(inject-integration-red.txt:漏 user_id 即红) | ✅ |
| R8 | 留空文本 → E-01 且不提交;14:00+14:00 → E-03;开始留空结束禁用 | schema.test;EntryForm.test ①②③;e2e R8 | 覆盖(逐字文案+字段位置+禁用态) | **注入验证**(inject-unit-red.txt:refine 放宽即红) | ✅ |
| R9 | 未登录直达 → 重定向 /login,响应不含日历内容 | e2e R9 | 覆盖(URL+文本计数 0) | 附带失败输出(t8-final-run 全绿) | ✅ |
| R10 | 登录后工作台可见入口,点击落于 /calendar 当前月 | e2e R10 | 覆盖(URL+月标签+今日高亮) | 附带失败输出(同上) | ✅ |
| R11 | 11-16 改期到 11-18 → 原日期不展示、新日期出现 | e2e R11;service.test 正向改期 | 覆盖(相对日期+跨月边界) | 附带失败输出(t8-second-run R11 红→修复→绿) | ✅ |
| R12 | 提交中重复点击不产生重复条目;保存失败 → E-02 呈现且原列表不变 | EntryForm.test ⑥⑦⑦';e2e R12 | 覆盖(disabled+单调用;abort→E-02 逐字+计数不变) | 附带失败输出(同上) | ✅ |
| design 补强 | 测试接缝 7 行(schema/month/EntryForm 组件/service 集成/actions 集成/migration 集成/E2E) | 各自测试文件 | 覆盖(逐行存在且通过) | 附带失败输出(各任务 evidence/t*-red.txt) | ✅ |
| design 补强 | 月网格数学(42 格/周一首日/邻月补位/闰月/跨年) | tests/calendar/month.test.ts 13 例 | 覆盖 | 附带失败输出(t1-red.txt) | ✅ |
| design 补强 | 迁移结构(列集/索引/无 FK) | tests/integration/calendar/migration.test.ts 3 例 | 覆盖 | 附带失败输出(t2-mig-red.txt) | ✅ |

## 非目标逐条表

| 非目标 # | 内容 | 核对方法 | 实现现状 | 结果 |
| ---- | ---- | ---- | ---- | ---- |
| 1 | 重复事件(不引入重复规则字段与展开逻辑) | 查表定义与迁移 SQL 无 recurrence 类字段;查模块无展开逻辑代码 | grep recurrence/repeat:零命中;迁移仅 8 列 | ✅ |
| 2 | 到点提醒 / 通知(不引入通知/调度接口与后台任务) | 查模块无定时器/队列/通知接口 | grep 无 timer/queue/notify;模块仅 schema/month/queries/service/actions/components | ✅ |
| 3 | AI 自动排期接入(不设 tools.ts,无 AI 介入路径) | 查模块文件清单无 tools.ts;grep 无 agent 引用 | ls 无 tools.ts;grep agent 零命中 | ✅ |
| 4 | 共享 / 协作、多日历 / 清单文件夹 | 查表无共享/协作者/日历实体/文件夹字段 | grep shared/collaborator:零命中;单表单日历 | ✅ |
| C-01 注记 | 分类 / 标签 / 颜色字段不引入 | 查表定义无 category/tag/color 字段;查 UI 无颜色选择器 | grep category/tag/color:零命中 | ✅ |

## 裁决记录落实核对

| 裁决 | 落实位置 | 是否按裁决实现 | design 指针 |
| ---- | ---- | ---- | ---- |
| T2 表定义/迁移/zod 合为单卡 | tasks.md Task 2;schema.ts 单文件承载 | 是 | 无(计划期裁决,不改 design) |
| T1 断言修正(11-01 inMonth) | tests/calendar/month.test.ts:25-35 | 是 | 无(测试断言修正,不涉 design) |
| 防御键文案补定 | src/locales/zh-CN/calendar.json error 组 | 是(messages.test 锁值) | 无 |
| DB 异常直通不设故障注入测试 | queries/service 无 catch;Next 错误边界兜底 | 是 | 无 |
| T4 会话桩 vi.mock | tests/integration/calendar/actions.test.ts:22-34 | 是 | 无 |
| T5/T7 i18n 补键 | calendar.json form/entry/page 键组 | 是 | 无 |
| T2 `.nullable()` RC API 偏离 | schema.ts time() 缺省可空 | 是 | **无(Minor:design 契约块留有 `.nullable()` 字样未加指针)** |
| T8 两产品缺陷回修 | EntryForm.tsx try/catch;DayPanel.tsx key 重挂载;补单测各一 | 是 | 无(实现层缺陷,不涉 design 契约) |
| T8 day-panel 测试锚点 | DayPanel.tsx data-testid | 是 | 无 |
| T9 lint 显式返回类型 + 坏链修复 | EntryForm.tsx CalendarEntryActionResult;design.md 链接 | 是 | 无 |

## 发现清单

| 严重度 | 发现 | 位置 | 修复建议 |
| ---- | ---- | ---- | ---- |
| Minor | design「契约」schema 代码块含 `.nullable()` 字样,drizzle 1.0 RC 实际无此 API(可空为缺省),裁决已记但 design 侧未留一行指针 | docs/dev/AXY-22-study-calendar/design.md:63-64 | 在 design 契约块后补一行注记指向 tasks 裁决「T2 执行」,或随下次 design 修订时顺带更正 |

## 性能与质量移交清单（测试提质）

| Q 编号 | 原文 | 验收归属 | 度量方式 | 移出依据(D-09) |
| ---- | ---- | ---- | ---- | ---- |
| Q1 | `/calendar` 首屏可交互 ≤ 2s(开发环境) | 测试提质阶段 | CI 流水线 + e2e 实测记录 | D-09:Q 条目验收后置 |
| Q2 | 条目创建 / 编辑 / 删除接口 p95 响应时间 ≤ 500ms(开发环境,每接口 ≥ 100 次采样) | 测试提质阶段 | 压测或脚本采样记录 | D-09:Q 条目验收后置 |

## 证据附录

| 命令 | 运行时间 | 输出摘要 |
| ---- | ---- | ---- |
| `npm test` | 2026-11-18(T9 回归) | 24 文件 / 193 例全绿(evidence/t9-regression.txt) |
| `npm run test:integration` | 2026-11-18(T9 回归) | 8 文件 / 37 例全绿(同上) |
| `npm run test:e2e`(全量) | 2026-11-18(T9 回归) | 25 例全绿,含 auth/homepage 回归(同上) |
| `npm run type-check` + `npm run lint` | 2026-11-18(T9 回归) | 干净退出(同上) |
| `npm run docs:build` | 2026-11-18(T9 回归) | 绿(evidence/t9-docsbuild.txt) |
| 注入验证·单元层 | 2026-11-18 | schema refine#2 放宽为 `>=` → refine#2 用例红(evidence/inject-unit-red.txt),恢复后 26 例绿(inject-restore.txt) |
| 注入验证·集成层 | 2026-11-18 | updateEntry WHERE 漏 user_id → R7 越权用例红(evidence/inject-integration-red.txt),恢复后 9 例绿 |
| E2E 先红后绿 | 2026-11-18(实现期) | t8-first-run(6 failed)→t8-second-run(2 failed)→t8-third-run(1 failed)→t8-final-run(11 passed),各任务单元/集成红输出见 evidence/t1-red…t8-key-red |

**证据不足测试清单:** 无——每层均有附带失败输出或注入验证;E2E 层未做现场注入(破坏实现须重建生产包,成本与证据增量不成比例),以实现期四轮红绿循环输出(6→2→1→0 failed)作为该层先红后绿证据。

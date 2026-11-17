---
title: 'Tasks: AXY-22 个人日程日历'
description: 个人日程日历的实现计划(微任务拆分/TDD 步骤/Interfaces)
sidebar_position: 3
---

# AXY-22 个人日程日历 实现计划

**Goal:** 按已批准 design 落地纯手动个人日程日历：`calendar_entry` 单表与迁移、月网格纯函数、按账号隔离的读/写链路（RSC 读 + Server Actions 写）、月视图 + 当日详情 UI 与工作台入口，R1–R12 全量测试承载。

**Date:** 2026-11-17

**Spec:** docs/product/AXY-22-study-calendar/proposal.md（需求规范,权威,v1）
**Design:** docs/dev/AXY-22-study-calendar/design.md（架构设计,契约来源,已批准）

**Tier:** 标准——含迁移、集成与 E2E,非轻量;纯 CRUD 单模块、无并发/安全敏感升级,不升严格。

## Global Constraints

- 校验单一来源：前后端共用 `calendarEntryInputSchema`（schema.ts），**不设 validators.ts**；zod message 直接承载 i18n key（ADR-0010），action 只返回错误 key 不返回文案原文。
- 文案逐字（`src/locales/zh-CN/calendar.json`）：`error.titleRequired`=「请填写事项内容」、`error.saveFailed`=「保存失败,请重试」、`error.endTimeAfterStart`=「结束时间需晚于开始时间」、`empty.day`=「这天还没有安排」、`page.title`=「日程日历」、`entryPoint`=「日程日历」；防御性键 `error.titleTooLong`/`error.invalidDate`/`error.invalidTime` 文案本计划补定（design 只锁键名）：「事项内容不能超过 50 字」「日期不合法」「时间不合法」。
- 数据模型硬约束：单表 `calendar_entry`，`userId text notNull` 为 Better Auth `user.id`（text），**不建 DB 级 FK**；索引显式名 `calendar_entry_user_date`（userId, entryDate 双列）；表定义用 drizzle-orm 1.0 RC `snakeCase.table` 写法（AYY-8 先例，禁止运行时 casing 选项）；迁移经 `npm run db:generate` 落 `src/db/migrations/`，不改旧迁移。
- 账号隔离三层（R7）：queries/service 全带 userId 条件；action 的 userId 取自 `getCurrentSession()`，不收客户端传入 userId；`updateEntry`/`deleteEntry` WHERE 含 `user_id`。
- 写路径基线流（ADR-0025）：Server Actions + `revalidatePath(ROUTES.calendar)`；**本期不引入 TanStack Query、无乐观更新**；条目数据不入 zustand（ADR-0009），`selectedDate`/表单草稿为组件本地态。
- 时区假设（design 开放问题 #2）：单时区，服务器时区 = 用户本地时区；entryDate 为字面日期 `YYYY-MM-DD`，无时区换算。
- 语义 token：颜色/圆角/阴影一律语义 token（ADR-0003）；组件从 `src/components/ui/` 选型，新增 `alert-dialog` 须经 shadcn CLI/MCP 查 registry 落地（ADR-0004）。
- 类型禁推断：`modules/`、`components/` 导出函数显式返回类型；模块内部相对导入（禁自引用顶入口）；`src/db/schema.ts` barrel 内部用相对导入。
- TDD 铁律：一切产品代码先写失败的测试再实现；每任务收尾跑 `npm test`（及至该任务为止已建的 `npm run test:integration`）。
- 测试命令经 `scripts/run-vitest.mjs` 包装（Windows 盘符问题,勿直接调 vitest CLI）；集成/E2E 需本地 PG/Redis（`compose.dev.yaml`）；E2E 对生产构建跑（`npm run test:e2e` 自动 build）。
- Next 16 与训练数据有破坏性差异：写 App Router 代码前先读 `node_modules/next/dist/docs/` 相应指南。
- 提交：Conventional Commits，中文描述。
- Q1（首屏 ≤2s）/Q2（CRUD p95 ≤500ms）由测试提质阶段验收：**不安排任何性能验证任务**。

## 不安排任务

| design 非目标 # | 刻意不做 | 理由 |
| ---- | ---- | ---- |
| 1 | 重复事件 | 不引入重复规则字段与展开逻辑,表结构无 recurrence 类字段 |
| 2 | 到点提醒 / 通知 | 不引入通知/调度接口与后台任务,无定时器或队列概念 |
| 3 | AI 自动排期接入 | 模块不设 `tools.ts`,无 AI 介入路径;对接另立故事 |
| 4 | 共享 / 协作、多日历 / 清单文件夹 | 单表单日历,无日历/文件夹实体、无共享字段与协作者概念 |
| design 注记(C-01) | 分类 / 标签 / 颜色 | proposal C-01 裁定本期不做,不引入任何分类/标签/颜色字段 |

## Review Focus

1. **越权写路径（R7）**：`updateEntry`/`deleteEntry` WHERE 漏 `user_id` 或 queries 未过滤 userId,乙可读写甲条目 → Task 3 集成跨用户断言（false + 不含对方条目）+ Task 4 越权 action 返回 NOT_FOUND。
2. **time 列秒位泄漏**：查询层漏 `formatHhmm` 归一则 UI 渲染「14:00:00–15:30:00」→ Task 1 单测 + Task 3 集成视图形状断言（`"HH:MM"`）+ Task 8 E2E 逐字断言「14:00–15:30」。
3. **`?month=` 非法参数**：`/calendar?month=9999-99` 等畸形值使 page 抛错或渲染错月 → Task 8 E2E 直访断言回退当前月且页面正常渲染。
4. **提交中重复提交（R12）**：`isPending` 缺失使双击产生重复条目 → Task 5 组件 disabled 断言 + Task 8 双击 E2E。
5. **删除确认层（D-08）**：确认层混入额外输入、或取消分支误删 → Task 6 组件测试先断（层内无输入控件、取消后不调 deleteEntryAction）+ Task 8 E2E 断言确认层无输入控件、取消后条目保留、确认后消失。

## R 覆盖对照

R1→T3/T4/T5/T8；R2→T3/T4/T5/T8；R3→T4/T5/T6/T8；R4→T3/T8；R5→T1/T3/T8；R6→T3/T6/T7/T8；R7→T3/T4；R8→T2/T5/T8；R9→T7/T8（守卫零新增,行为断言归 T8）；R10→T7/T8；R11→T5/T8；R12→T5/T6/T8。

## 执行纪律（全局声明一次，任务卡不重复）

每个任务默认按 TDD 六步执行：

1. **写失败测试**（测试名与断言见任务卡「失败测试」行，spec 的精确值写在测试里）；
2. **运行测试，确认以「预期失败」所述方式失败**；
3. **在「实现」落点完成最小实现**；
4. **运行测试，确认通过**；
5. **运行全量测试套件，确认全绿**；
6. **按「提交」信息提交**。

## 任务

### Task 1: month.ts 日历数学纯函数

**Files:** Create `src/modules/calendar/month.ts` · Test `tests/calendar/month.test.ts`

**Interfaces:**
- Consumes: 无（零 IO 纯函数）。
- Produces（design 契约原样）:
  - `type MonthCell = { date: string; inMonth: boolean; isToday: boolean }`
  - `buildMonthGrid(year: number, month: number, today: string): MonthCell[]`——6 行 × 7 列,周一为每周首日,含邻月补位格（inMonth=false）
  - `monthRange(year: number, month: number): { start: string; end: string }`——该月日期闭区间 "YYYY-MM-DD"
  - `addMonths(year: number, month: number, delta: number): { year: number; month: number }`——month 1–12,自动进退位
  - `isValidDateString(value: string): value is string`——格式合法且为真实日历日
  - `formatHhmm(time: string): string`——"HH:MM:SS" → "HH:MM"

**AC / 演示态:** 无（单元,支撑函数）

**失败测试:** `buildMonthGrid`：2026-11 → 恰 42 格、首格 2026-10-26（周一）、11-01 补位 inMonth=false、11-30 inMonth=true、今日传 "2026-11-17" 时该格 isToday=true 且唯一；`monthRange`：2026-11 → `{start:"2026-11-01", end:"2026-11-30"}`、闰月 2028-02 → end "2028-02-29"；`addMonths`：(2026,1,-1)→`{2025,12}`、(2026,12,1)→`{2027,1}`；`isValidDateString`：接受 "2026-11-17"、拒 "2026-02-30"、"2026-13-01"、"20261117"、"2026-11-1"；`formatHhmm`："14:00:00"→"14:00"。

**预期失败:** FAIL——`@/modules/calendar/month` 模块不存在（Cannot find module）。

**实现:** `src/modules/calendar/month.ts` 逐签名落实现；日期数学基于原生 Date/字符串运算,不引日期库。

**提交:** `feat(calendar): 月网格与日历数学纯函数`

---

### Task 2: schema.ts 表定义 + 迁移 + zod 契约（单一来源）

**Files:** Create `src/modules/calendar/schema.ts` · Modify `src/db/schema.ts`（barrel `export *`） · Create `src/db/migrations/<timestamp>_<生成名>/`（`npm run db:generate`） · Test `tests/calendar/schema.test.ts`、`tests/integration/calendar/migration.test.ts`

**Interfaces:**
- Consumes: `isValidDateString`（Task 1,模块内相对导入）。
- Produces（design 契约原样）:
  - drizzle 表 `calendarEntry`（表名 `calendar_entry`）：`id uuid().primaryKey().defaultRandom()`、`userId text().notNull()`、`entryDate date({ mode: 'string' }).notNull()`、`title text().notNull()`、`startTime time().nullable()`、`endTime time().nullable()`、`createdAt/updatedAt timestamp({ withTimezone: true }).notNull().defaultNow()`；索引 `index("calendar_entry_user_date").on(t.userId, t.entryDate)`；无 FK
  - `TIME_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/`
  - `calendarEntryInputSchema`（zod,message 为 i18n key）：`date` refine isValidDateString → "calendar.error.invalidDate"；`title` min(1)→"calendar.error.titleRequired" max(50)→"calendar.error.titleTooLong"；`startTime/endTime` `z.string().regex(TIME_HHMM_RE, "calendar.error.invalidTime").nullable()`；refine#1 endTime 有值须 startTime 非空（path endTime, "calendar.error.endTimeAfterStart"）；refine#2 endTime > startTime（同 path 同 message）
  - `type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>`
  - `type CalendarFieldErrors = Partial<Record<"date" | "title" | "startTime" | "endTime", string>>`

**AC / 演示态:** 无（单元 + 集成结构兜底）

**失败测试:** schema.test.ts 表组——列集与可空性、`calendar_entry_user_date` 双列索引、无 DB 级 FK（information_schema 无该列外键约束）；契约组——title ''→titleRequired、51 字→titleTooLong、50 字通过、双 50 字符串通过；"24:00"/"7:00"/"14:0"→invalidTime、"00:00"/"23:59" 通过；date "2026-02-30"→invalidDate、refine#1 startTime null + endTime "14:00"→endTimeAfterStart；refine#2 "14:00"+"14:00"→endTimeAfterStart、"14:00"+"13:59"→endTimeAfterStart、"14:00"+"15:30" 通过、双 null 通过、"14:00"+null 通过。migration.test.ts（集成,真实 PG）——`information_schema.columns` 含全列、`pg_indexes` 含 `calendar_entry_user_date`、无 user_id 外键约束。

**预期失败:** FAIL——单测：calendarEntry/schema 导出不存在;集成：查库无 calendar_entry 表/索引。

**实现:** 先单测红 → schema.ts 表定义 + 契约（`snakeCase.table` 写法,barrel 相对导入 `export * from "../modules/calendar/schema"`）→ 单测绿;再集成红 → 前置核对 calendar_entry 确不存在 → `npm run db:generate` 生成迁移并人工核对 SQL（uuid default、date/time 列、双列索引,无 FK）→ 集成跑绿（globalSetup 自动应用迁移链）。

**提交:** `feat(calendar): calendar_entry 单表迁移与 zod 校验单一来源`

---

### Task 3: queries.ts + service.ts 读写链路（集成）

**Files:** Create `src/modules/calendar/queries.ts`、`src/modules/calendar/service.ts` · Test `tests/integration/calendar/service.test.ts`

**Interfaces:**
- Consumes: `calendarEntry` 表（Task 2）、`formatHhmm`/`monthRange`（Task 1）、db（`src/db/client.ts` 既有）。
- Produces（design 契约原样）:
  - `type CalendarEntryView = { id: string; date: string; title: string; startTime: string | null; endTime: string | null }`
  - `listMonthEntries(userId: string, year: number, month: number): Promise<CalendarEntryView[]>`——按账号 + `monthRange` 区间读;排序 entryDate 升序、同日不带时间在前、带时间按 startTime 升序;startTime/endTime 经 `formatHhmm` 归一。错误情形:DB 异常向上抛
  - `createEntry(userId: string, input: CalendarEntryInput): Promise<void>`——单行 INSERT;DB 异常向上抛
  - `updateEntry(userId: string, entryId: string, input: CalendarEntryInput): Promise<boolean>`——WHERE id + user_id;false = 未命中或不属该用户
  - `deleteEntry(userId: string, entryId: string): Promise<boolean>`——同上

**AC / 演示态:** 无（集成,AC-4/AC-6 服务端半边 + R7 越权断言）

**失败测试:** service.test.ts（造号沿 `tests/integration/helpers.ts` 既有 helper,直接插 user 行或经 registerWithUsername）——①R4 重叠：同 userId 同 entryDate 写 "14:00–15:30" 与 "14:30–15:00" 两行均成功、`listMonthEntries` 返回 2 行;②R6/R7 隔离：甲乙两号各建条目,`listMonthEntries(甲)` 不含乙条目、反之亦然;③R7 越权写：以乙 userId 调 `updateEntry`/`deleteEntry`（甲的 entryId）→ false 且甲条目原样;④R5 过去日期：entryDate "2026-01-01" 可写可查;⑤排序：同日混排（无时间 + 14:30 + 09:00）→ 无时间行最前、其余 startTime 升序;⑥视图形状：startTime/endTime 为 "HH:MM"（无秒位,Review Focus #2）。

**预期失败:** FAIL——queries/service 模块不存在。

**实现:** queries 按 userId + entryDate 区间查（drizzle `and`/`gte`/`lte`）+ 内存排序;service 三函数 WHERE 全带 user_id;写列 startTime/endTime 直存 "HH:MM"（time 列兼容,查询归一由 formatHhmm 承担）。

**提交:** `feat(calendar): 按账号隔离的条目读写链路`

---

### Task 4: actions.ts 判别联合 + ROUTES.calendar

**Files:** Create `src/modules/calendar/actions.ts` · Modify `src/lib/routes.ts`（新增 `calendar: "/calendar"`） · Test `tests/integration/calendar/actions.test.ts`

**Interfaces:**
- Consumes: `calendarEntryInputSchema`/`CalendarEntryInput`/`CalendarFieldErrors`（Task 2）、`createEntry`/`updateEntry`/`deleteEntry`（Task 3）、`getCurrentSession`（`src/modules/auth/queries.ts` 既有）。
- Produces（design 契约原样）:
  - `type CalendarEntryActionResult = { ok: true } | { ok: false; error: "INVALID_INPUT"; fieldErrors: CalendarFieldErrors } | { ok: false; error: "UNAUTHORIZED" } | { ok: false; error: "NOT_FOUND" } | { ok: false; error: "SAVE_FAILED" }`
  - `createEntryAction(input: CalendarEntryInput): Promise<CalendarEntryActionResult>`、`updateEntryAction(entryId: string, input: CalendarEntryInput): Promise<CalendarEntryActionResult>`、`deleteEntryAction(entryId: string): Promise<CalendarEntryActionResult>`——`'use server'`;统一流程 getCurrentSession → zod safeParse 复验 → service → `revalidatePath(ROUTES.calendar)`

**AC / 演示态:** 无（集成,R7/R8 服务端半边）

**失败测试:** actions.test.ts（会话桩机制沿 `tests/integration/auth/actions.test.ts` 既有方式）——①无会话 → UNAUTHORIZED（三 action 各一例）;②非法入参：title "" → INVALID_INPUT + fieldErrors.title = "calendar.error.titleRequired";startTime "14:00" + endTime "14:00" → fieldErrors.endTime = "calendar.error.endTimeAfterStart";③update/deleteEntryAction 未命中 id → NOT_FOUND;④越权：乙会话调甲 entryId 的 update/delete → NOT_FOUND（service false 归一,Review Focus #1）;⑤合法创建 → ok:true 且库有行;⑥合法更新/删除 → ok:true 且库行变更/消失;⑦SAVE_FAILED 分支存在性（类型面,运行时注入失败不强制造库故障）。

**预期失败:** FAIL——actions 模块不存在（Cannot find module '@/modules/calendar/actions'）。

**实现:** 三 action 共用私有归一流（会话 → safeParse → service → revalidate）;service 异常 catch 转 SAVE_FAILED;`ROUTES.calendar` 加入 routes.ts。

**提交:** `feat(calendar): 条目 Server Actions 判别联合与工作台路由常量`

---

### Task 5: EntryForm + calendar.json 文案 + 组件测试

**Files:** Create `src/locales/zh-CN/calendar.json`、`src/modules/calendar/components/EntryForm.tsx` · Test `tests/i18n/messages.test.ts`（追加 calendar 命名空间组）、`tests/calendar/components/EntryForm.test.tsx`

**Interfaces:**
- Consumes: `calendarEntryInputSchema`/`CalendarFieldErrors`（Task 2）、`createEntryAction`/`updateEntryAction`（Task 4）、`useTranslations('calendar')`、`ROUTES`、既有 `src/components/ui/` 的 button/input/label。
- Produces（Task 6/7 消费的组件契约）:
  - `EntryForm({ date, entry }: { date: string; entry?: CalendarEntryView })`——新建/编辑复用（entry 在场即编辑模式,预填原值,含所属日期 `<input type="date">`）;新建模式不显示日期控件
  - 行为契约：客户端 `safeParse` 失败即地呈现 E-01（title 下）/E-03（endTime 下）且不调 action;提交中 `isPending` 按钮置灰 disabled;`UNAUTHORIZED` → `router.replace(ROUTES.login)`;`NOT_FOUND` → `router.refresh()` 静默刷新;`SAVE_FAILED` → 表单提示区「保存失败,请重试」;成功 → `onSaved?` 回调（props 可选扩展）且表单复位
  - 开始留空 → 结束控件 `disabled`;填开始 → 恢复可输

**AC / 演示态:** AC-1/AC-2/AC-5 表单半边;R8/R12 组件级承载（演示态 2/3/5）

**失败测试:** EntryForm.test.tsx——①事项留空提交 → 「请填写事项内容」渲染于文本字段下方且 createEntryAction 未被调;②开始 "14:00" + 结束 "14:00" 提交 → 「结束时间需晚于开始时间」于结束字段下方;③开始留空 → 结束 input disabled;填开始 → enabled;④开始 "14:00" 结束空提交 → 不走 E-03,action 以 `{ date, title, startTime: "14:00", endTime: null }` 形态被调（创建不带时间半边按 startTime 有值 endTime null 断言）;⑤编辑模式：entry 预填（title/时间/日期控件在场）,提交调 updateEntryAction;⑥isPending：action Promise 挂起期间按钮 disabled 且二次点击仅一次调用;⑦SAVE_FAILED → 「保存失败,请重试」且不抛;⑧UNAUTHORIZED → router.replace('/login')。messages.test.ts——calendar 命名空间 9 键逐字（Global Constraints 文案值）。

**预期失败:** FAIL——EntryForm 组件与 calendar.json 不存在。

**实现:** 单一 schema 客户端 safeParse;messageKey 经 `t(key)` 渲染;时间控件原生 `<input type="time">`;提交经 action 判别联合分流;i18n 设施零改动（仅新增 json）。

**提交:** `feat(calendar): 条目表单组件与 calendar 文案键`

---

### Task 6: EntryRow + DayPanel + shadcn alert-dialog

**Files:** Create `src/modules/calendar/components/EntryRow.tsx`、`src/modules/calendar/components/DayPanel.tsx` · Modify `src/components/ui/`（shadcn CLI/MCP 安装 `alert-dialog`,ADR-0004） · Test `tests/calendar/components/DayPanel.test.tsx`

**Interfaces:**
- Consumes: `EntryForm`（Task 5）、`CalendarEntryView`（Task 3）、`deleteEntryAction`（Task 4）、shadcn `alert-dialog`。
- Produces（Task 7 消费）:
  - `EntryRow({ entry, onEdit }: { entry: CalendarEntryView; onEdit: () => void })`——行文案「HH:MM–HH:MM title」（无时间仅 title,经 Task 3 归一值）;「编辑」→ onEdit;「删除」→ AlertDialog 二次确认（确认层无额外输入,D-08）→ `deleteEntryAction`;`NOT_FOUND` → 静默刷新
  - `DayPanel({ date, entries, today }: { date: string; entries: CalendarEntryView[]; today: string })`——标题 date===today ? 「M月D日 · 今天」:「M月D日」;条目列表 EntryRow;空态「这天还没有安排」;底部嵌 `EntryForm`（编辑模式经本组件本地态切换,编辑时 EntryForm 预填被编辑条目）

**AC / 演示态:** AC-3/AC-6 承载组件;R3/R6 渲染半边（演示态 1/3;删除/空态行为断言归 Task 8 E2E）

**失败测试:** DayPanel.test.tsx（`deleteEntryAction` 经 vi.mock）——①空态:entries=[] → 渲染「这天还没有安排」（R6 渲染半边）;②标题:date===today → 「11月17日 · 今天」,date≠today → 「11月16日」;③行文案:带时间 entry 渲染「14:00–15:30」+「高数复习」,无时间 entry 仅 title;④删除确认层（Review Focus #5,组件级）:点「删除」出现确认层且层内无输入控件,「取消」后条目行仍在且 deleteEntryAction 未被调。

**预期失败:** FAIL——DayPanel/EntryRow 组件不存在（Cannot find module）。

**实现:** `alert-dialog` 经 shadcn registry 安装;EntryRow/DayPanel 按 design §UI-2 落地;文案全部经 `useTranslations('calendar')`。

**提交:** `feat(calendar): 当日详情面板与条目行删除二次确认`

---

### Task 7: page.tsx RSC + CalendarScreen + MonthGrid + 工作台入口

**Files:** Create `src/app/(app)/calendar/page.tsx`、`src/modules/calendar/components/CalendarScreen.tsx`、`src/modules/calendar/components/MonthGrid.tsx` · Modify `src/app/(app)/workbench/page.tsx`（新增入口 Link） · Test `tests/calendar/components/MonthGrid.test.tsx`

**Interfaces:**
- Consumes: `buildMonthGrid`/`addMonths`/`monthRange`/`isValidDateString`（Task 1）、`listMonthEntries`/`CalendarEntryView`（Task 3）、`getCurrentSession`（auth 既有）、`DayPanel`/`EntryRow`（Task 6）、`ROUTES.calendar`/`calendar.entryPoint`（T4/T5）。
- Produces:
  - `page.tsx`（RSC,`export const instant = false`,同 workbench 豁免）——searchParams `?month=YYYY-MM`（Next 16 为 Promise,须 await）;缺省/非法回退服务器当前月;取 session → `listMonthEntries(userId, year, month)` + 服务器 today 串 props 下行
  - `CalendarScreen({ year, month, today, entries })`（Client）——`selectedDate` 本地 useState,初始回落：今日在该月选今日,否则选该月 1 日;组装 MonthGrid + DayPanel
  - `MonthGrid({ year, month, today, entries, selectedDate, onSelect }: { ...; onSelect: (date: string) => void })`（Client）——消费 `buildMonthGrid` 渲染 42 格;今日格常亮、选中格独立可区分（语义 token）;每格摘要 ≤2 条（带时间「HH:MM title」/不带「title」）,超出「+N」;点击格 → onSelect

**AC / 演示态:** AC-6/路由行为 #1、#2（演示态 1;读路径行为断言归 Task 8 E2E）

**失败测试:** MonthGrid.test.tsx——①渲染恰 42 格;②今日格含 isToday 标识、选中格含选中标识且与今日可区分（类名断言）;③entries 按格归位：11-17 两条目 → 该格出现 2 摘要行,带时间行以 "14:00 " 前缀;④3 条目 → 该格 2 行 + 「+1」;⑤点击非选中格 → onSelect 以该格 date 被调。page/workbench 行为（守卫、入口、当前月默认）无单测,归 Task 8 E2E。

**预期失败:** FAIL——MonthGrid 组件不存在。

**实现:** page 按 design §UI-1 落地（守卫零新增,继承 (app)/layout）;workbench `<main>` 内加 `<Link href={ROUTES.calendar}>`（文案 `calendar.entryPoint`,不改既有行为,D-06）;月导航「上一月/下一月」`<Link>` href 带 `?month=`（经 addMonths 计算,服务端重取）。

**提交:** `feat(calendar): 日历页 RSC 读路径与工作台入口`

---

### Task 8: E2E 全流程

**Files:** Create `e2e/calendar.spec.ts` · Modify `e2e/helpers/auth.ts`（如需导出既有 helper）

**Interfaces:**
- Consumes: 全部前序产物（生产构建 + 真实 PG/Redis）;`e2e/helpers/auth.ts` 既有 `registerViaUI`/`uniqueUsername`/`throttleSignIn`。
- Produces: E2E 证据（R1–R6、R8–R12 浏览器级;R7 双半边证据在 T3/T4）。

**AC / 演示态:** AC-1～AC-6;演示态 1（空态月视图）/2（创建带·不带时间 + 校验 + 提交态）/3（编辑删除）/4（重叠并存）/5（过去补记）;路由行为 #1/#2（R9/R10 无演示态）

**失败测试:** 用例组——①R9：未登录直访 `/calendar` → 最终落于 `/login`;②R10：注册登录 → 工作台见「日程日历」→ 点击落于 `/calendar` 当前月,月网格今日高亮;③演示态 1/R6：当日无条目 → 「这天还没有安排」;④R1：选今日创建「高数复习」14:00–15:30 → 详情与月格摘要出现「14:00–15:30」字样（Review Focus #2 秒位泄漏在此断言）;⑤R2：仅填「交英语作业」提交 → 条目落该天无时间显示、与带时间条目并存;⑥R8：留空提交 → 「请填写事项内容」且不提交;开始 14:00 结束 14:00 提交 → 「结束时间需晚于开始时间」;开始留空 → 结束控件 disabled;⑦R3：编辑文字/时间即时更新;删除取消 → 保留;删除确认 → 条目消失（确认层无输入控件断言）;⑧R4：再创建 14:30–15:00 → 两条并存、全程无冲突提示;⑨R5：月视图选昨日创建 → 归入昨日、月格摘要同步;⑩R11：编辑改所属日期（经 `<input type="date">` 填充,日期取相对值勿硬编码 proposal 示例日）→ 原日期消失、新日期出现;⑪R12：action 路由拦截延迟期间重复点击「添加」→ 恰一条目;拦截 abort 模拟保存失败 → 「保存失败,请重试」且原列表不变;⑫Review Focus #3：直访 `/calendar?month=9999-99` 与 `?month=2026-13` → 回退当前月正常渲染。

**预期失败:** 首跑记录失败清单（预期为胶水/文案/定位缺口;若全绿逐条核对断言强度后提交信息注明）。

**实现:** 测试即交付物;发现产品缺陷回对应任务模块修复并补单测（偏离记裁决）;定位器沿 auth 先例用字段 id/语义锚点。

**提交:** `test(e2e): 日历全流程浏览器级验证`

---

### Task 9: 全量回归收尾与文档修订

**Files:** Modify `docs/dev/代码目录.md`（「公共层」表一行,开放问题 #1） · Modify `docs/dev/AXY-22-study-calendar/design.md`（如执行期有裁决需一行指针回写）

**Interfaces:**
- Consumes: 全部前序任务产物。
- Produces: 收口证据与文档一致性（开放问题 #1 闭合：db/schema 属主文件约定按 auth 先例修订该行表述）。

**失败测试:** 无新增测试文件（验证方式见步骤）。

**实现步骤:** ①`npm run type-check` + `npm run lint` 干净退出;②`npm test` 全绿;③`npm run test:integration` 全绿;④`npm run test:e2e` 全绿;⑤`npm run docs:build` 绿;⑥按开放问题 #1 修订代码目录文档「公共层」表 `db/schema/<模块>.ts` 一行为模块属主先例表述;⑦裁决记录若承诺 design 回写,一行指针落 design。

**提交:** `chore(calendar): AXY-22 收尾回归与代码目录文档修订`

---

## 裁决记录

执行中发现的计划缺陷记入此处，格式：`裁决: <决定了什么> — <为什么> — <错了的代价>`。

- 裁决（计划期）: Task 2 将表定义/迁移/zod 契约合为单卡 — 三者同属 schema.ts 属主文件且迁移红绿序列内嵌于同一 TDD 循环（AXY-8 Task 3 同款） — 卡面较长但无函数体,可审
- 裁决（计划期）: Task 6 补设 `DayPanel.test.tsx`（空态/标题/行文案/删除确认层四例）,超出 design 测试接缝表所列组件测试范围 — 组装层组件写产品代码须有先红测试,TDD 铁律优先于「接缝表未列」的留白 — 若不补,Task 6 全卡无红测试,违反硬门禁
- 裁决（计划期）: `listMonthEntries` 与 service 三函数的「DB 异常向上抛」错误情形不设故障注入测试 — 读路径为直通传播、无处理代码（Next 错误边界兜底）,写路径运行时 SAVE_FAILED 已由 T8 ⑪ 路由拦截覆盖 — 强造库故障只会测到 drizzle/PG 自身行为
- 裁决（T1 执行）: 修正任务卡断言「11-01 补位 inMonth=false」为「补位格止于 10-31,11-01 inMonth=true」 — 2026-11-01 是周日但属 11 月真实日期,计划期日历推算失误 — 不改则测试钉死错误日历语义
- 裁决（T4 执行）: 会话桩机制为 vi.mock('@/modules/auth') 桩 getCurrentSession + vi.mock('next/cache') 桩 revalidatePath（并断言其入参） — 任务卡写「沿 auth actions.test 既有方式」,但 auth 集成测试无会话桩先例（registerAction 不需会话）,getCurrentSession 依赖 next/headers 请求上下文集成环境不可用 — 卡面表述落空,桩为唯一可行路径
- 裁决（T5/T7 执行）: calendar.json 在 design 键表外补 form/entry/page(月导航)键组（字段标签、添加/保存/编辑/删除按钮、确认层、上一月/下一月/monthLabel） — design 只锁 E 表与空态/页题键,但组件用户可见文案按 ADR-0010 不得硬编码 — 键值无逐字约束,产品侧如后续定义以 design 修订为准
- 裁决（T2 执行）: drizzle-orm 1.0 RC 列构建器无 .nullable() 链（可空为缺省,仅 .notNull()）,任务卡 Produces 行「time().nullable()」按实际 API 落为 time() — 训练数据与 RC API 差异,auth 先例 image: text() 同款 — 类型面不变,time 列仍可空
- 裁决（T8 执行）: E2E 揭示两产品缺陷并回修 EntryForm/DayPanel（补单测各一例）——①传输层异常（fetch reject）未归一 E-02,proposal E-02 明含「网络异常」,design 仅写「SAVE_FAILED ← DB 异常」漏传输半边;②新建→编辑切换 EntryForm 已挂载,entry prop 后到不触发 useState 初始化器,预填为空 — 组合测试只测了「直接以编辑模式挂载」漏切换场景 — 缺陷若留至线上,网络故障呈未捕获异常、编辑打开空白表单覆盖原值
- 裁决（T8 执行）: e2e 断言锚点收窄至 data-testid="day-panel"（组件新增测试锚点属性,session-account 先例同款） — 月格摘要与详情行天然同文案,页面级 getByText 必双匹配 — 不收窄则 R1/R2/R3/R11/R12 全部 strict violation 误报
- 裁决（T9 执行）: EntryForm 传输层 catch 的返回标注由 `Awaited<ReturnType<typeof createEntryAction>>` 改引显式 `CalendarEntryActionResult` — 仓库 lint 规则 no-restricted-syntax 禁用服务端返回类型推断（沿调用链扩散、掩盖契约变化） — 不改则 lint 门禁阻断 CI
- 裁决（T9 执行）: 随本特性 PR 修复 docs 构建两处坏链——AXY-22 design 的 proposal 链接改相对路径（AXY-8 先例格式）;AXY-8 review 墓碑的 FormSummary.tsx 死链（79a0132 删文件遗留,非本特性引入）去链接留注记 — docs:build 对坏链零容忍,不修则 T9 ⑤ 无法闭合
- 裁决（计划期）: 防御性键 `titleTooLong`/`invalidDate`/`invalidTime` 文案值由本计划补定（design 仅锁键名）,取值见 Global Constraints — 实现需确切文案才能落 json 与测试 — 若产品侧后续逐字定义,以 design 修订为准回改

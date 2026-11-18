# AXY-23 日程周视图 实现计划

**Goal:** 在 `/calendar` 新增默认周视图(7 天 × 24 小时网格 + 全天区 + 实时线 + 网格点击编辑),零迁移零新端点。

**Date:** 2026-11-19

**Tier:** 标准——单模块呈现层增量,无迁移/并发/跨模块,但含 E2E,保留完整流程。

**Spec:** docs/product/AXY-23-week-view/proposal.md(仅追溯指针,不要求读取)
**Design:** docs/dev/AXY-23-week-view/(design.md + contracts / testing / adr,唯一信息来源)

## Global Constraints

- 零迁移、零新日历端点:读仅新增 `listWeekEntries`,写路径复用既有 `createEntryAction / updateEntryAction / deleteEntryAction`,不修改其签名。
- `userId` 恒取会话(`getCurrentSession`),不收客户端传入(R7)。
- 日期语义:字面 `"YYYY-MM-DD"`,零日期库,禁本地时区换算(`week.ts` 与 `month.ts` 同风格);`month` 入参 1–12。
- F-05:槽粒度 30 分钟,点击预填向下取整到槽起点(`"HH:00"`/`"HH:30"`),结束时间预填留空。
- F-06:实时线以客户端本地时区当前时间计算,每分钟更新一次。
- E-04 文案逐字「这周还没有安排」、E-05 文案逐字「加载失败,请重试」——locale 值即真源,测试逐字断言。
- 色块/实时线/空态全部用 `calendar-theme` 既有语义 token,零新色值;实心控件纯色,禁渐变。
- D-12:仅开始时间条目渲染 30 分钟高短色块;D-10:初始滚动锚定当前时段,非今天所在周锚 08:00。
- R10 断言口径:URL 全程停留在 `/calendar` **路径**,searchParams 变化(`?view=`/`?week=`/`?month=`)不算离开。
- shadcn Dialog 经 CLI 新增且**单独成 commit**(ADR-0004 约定)。
- design 开放问题 #2 假设:E-05 归组件测试,E2E 只覆盖正常加载路径。
- Q1–Q3(首屏 ≤2s / p95 ≤500ms / 实时线更新 ≤16ms)不安排验证任务——测试提质阶段验收。

## 不安排任务

| design 非目标 # | 刻意不做 | 理由 |
| ---- | ---- | ---- |
| 1 | 拖拽移动色块、拖边调整时长 | D-04:点选式编辑已覆盖;色块不挂拖拽事件 |
| 2 | 地点、标签/分类、每条目独立颜色 | D-03 / D-11:编辑卡两字段;色块单一品牌 token |
| 3 | 修改条目数据模型(新属性/新状态/新接口) | 零迁移零端点,`calendar_entry` 表不动 |
| 4 | 跨午夜时间段 | 继承 AXY-22 F-03,不放宽 zod 校验 |
| 5 | 移动端专属周视图形态(单日纵列降级) | D-09:仅横向滚动容器 |

## Review Focus

1. 重叠色块布局:同一列多块重叠时簇内并列均分、`leftPercent + widthPercent` 恒为 100——Task 2 单测固定。
2. `?week=` 非法值(非周一、`2026-02-30`、乱格式)静默回退今天所在周,不报错——Task 1 单测 + Task 10 E2E 固定。
3. 跨月/跨年周的区间与翻周(如 2025-12-29 → 2026-01-04)——Task 1 单测 + Task 4 集成固定。
4. 账号隔离:账号乙不可经 `listWeekEntries` 取账号甲条目——Task 4 集成固定(R7)。
5. 实时线可见性:仅今天所在周渲染,翻走即隐——Task 8 组件测试固定(R2)。

## 执行纪律(全局声明一次,任务卡不重复)

每个任务默认按 TDD 六步执行:写失败测试 → 确认以「预期失败」所述方式失败 → 最小实现 → 确认通过 → 全量套件全绿 → 按「提交」信息提交。

## 任务

### Task 1: week.ts 周数学纯函数

**Files:** Create `src/modules/calendar/week.ts` · Test `tests/calendar/week.test.ts`

**Interfaces:** Consumes 无。Produces `weekStartFor(date: string): string` / `buildWeekDays(weekStart: string, today: string): WeekDay[]`(`{date, weekdayKey: "mon".."sun", isToday}`)/ `weekRange(weekStart): {start, end}` / `addWeeks(weekStart, delta): string` / `isValidWeekStart(value): value is string`;类型 `WeekdayKey` / `WeekDay`。

**失败测试:** 周中日期→所在周周一、周一恒等、2025-12-29→2026-01-04 跨年周;`buildWeekDays` 恰 7 项、列序 mon..sun、isToday 唯一命中;`weekRange` 周一..周日闭区间跨月跨年;`addWeeks` ±1 与 0 恒等;`isValidWeekStart` 拒非周一(周四)、拒 `2026-02-30` 与乱格式、收合法周一。

**预期失败:** 模块与导出不存在。

**实现:** UTC 毫秒运算 + 手工日历数学,头注释声明与 `month.ts` 同源约定。

**提交:** `feat(calendar): 周视图周数学纯函数(周锚点/周区间/翻周)`

### Task 2: week.ts 网格几何纯函数

**Files:** Modify `src/modules/calendar/week.ts` · Test `tests/calendar/week.test.ts`(追加)

**Interfaces:** Consumes `CalendarEntryView`(queries 既有类型)。Produces `timeToMinutes(time: "HH:MM"): number`(0–1439,非法抛 RangeError)/ `slotPrefillStart(minutes: number): string`(F-05 向下取整)/ `layoutDayBlocks(dayEntries: CalendarEntryView[]): WeekBlock[]`;类型 `WeekBlock = {entryId, leftPercent, widthPercent, startMinutes, durationMinutes}`。

**失败测试:** `timeToMinutes("14:30")===870`;`slotPrefillStart` 14:20→"14:00"、14:30→"14:30"、23:59→"23:30";`layoutDayBlocks` 仅开始时间条目 `durationMinutes===30`(D-12)、无重叠块满列宽、两/三重叠簇并列均分且簇内 `leftPercent+widthPercent===100`(Review Focus 1)、入参顺序无关。

**预期失败:** 导出不存在。

**提交:** `feat(calendar): 周网格几何纯函数(槽预填与重叠均分布局)`

### Task 3: i18n 周视图文案键

**Files:** Modify `src/locales/*.json`(zh 与 en 的 calendar 命名空间追加 `week.*`)· Test `tests/calendar/locales.test.ts`

**Interfaces:** Consumes 无。Produces 键 `calendar.week.viewWeek / viewMonth / prevWeek / nextWeek / today / allDay / emptyWeek / loadFailed / retry / nowLine / createAt`(createAt 含 `{weekday}` `{time}` 插值)。

**失败测试:** 读取 zh locale JSON,断言 `calendar.week.emptyWeek === "这周还没有安排"`、`calendar.week.loadFailed === "加载失败,请重试"`(逐字),其余九键存在且非空;en 侧键齐全。

**预期失败:** `week` 命名空间不存在。

**提交:** `feat(calendar): 周视图 i18n 文案键(E-04/E-05 逐字)`

### Task 4: listWeekEntries 查询

**Files:** Modify `src/modules/calendar/queries.ts` · Test `tests/integration/calendar/queries.test.ts`(Create)

**Interfaces:** Consumes `weekRange`(Task 1)。Produces `listWeekEntries(userId: string, weekStart: string): Promise<CalendarEntryView[]>`(恒带 userId 条件;错误情形:DB 异常上抛,由 `/calendar` 路由错误边界兜底)。

**失败测试(集成):** 周区间过滤正确且含跨月周(Review Focus 3);账号乙的数据不出现在账号甲结果中(Review Focus 4,R7);空周返回 `[]`;排序与 `listMonthEntries` 口径一致(同日 `compareEntries`)。

**预期失败:** 导出不存在。

**提交:** `feat(calendar): 周区间条目查询 listWeekEntries(按账号隔离)`

### Task 5: shadcn Dialog 组件引入

**Files:** Create `src/components/ui/dialog.tsx`(shadcn CLI)

**Interfaces:** Produces shadcn Dialog 族(`Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter / DialogClose`),供 Task 7 消费。

**失败测试:** 无——脚手架引入,非产品代码路径(执行纪律豁免);验证为 `npx tsc --noEmit` 通过。

**提交:** `chore(ui): 新增 shadcn Dialog 组件(ADR-0004:单独成 commit)`

### Task 6: EntryForm 支持隐藏日期字段

**Files:** Modify `src/modules/calendar/components/EntryForm.tsx` · Test `tests/calendar/components/EntryForm.test.tsx`(Create)

**Interfaces:** Consumes 既有 `EntryFormProps`。Produces `showDateField?: boolean = true`——`false` 时不渲染日期控件,create 模式提交 `date` prop,edit 模式锁定 `entry.date`;其余行为(校验呈现、isPending、onSaved)不变。

**失败测试(组件):** `showDateField: false` 渲染无日期输入且提交 payload 日期等于 `date` prop;默认不传时行为与现状一致(日期控件在场)。

**预期失败:** prop 不存在,日期控件恒渲染。

**提交:** `feat(calendar): EntryForm 支持隐藏日期字段(周视图编辑卡复用)`

### Task 7: WeekEntryDialog 编辑卡

**Files:** Create `src/modules/calendar/components/WeekEntryDialog.tsx` · Test `tests/calendar/components/WeekEntryDialog.test.tsx`(Create)

**Interfaces:** Consumes EntryForm `showDateField=false`(Task 6)、Dialog 族(Task 5)、`createEntryAction / updateEntryAction / deleteEntryAction`(既有,错误情形:判别联合 `CalendarEntryActionResult`,INVALID_INPUT fieldErrors → 字段下方,SAVE_FAILED → 表单提示区)。Produces `WeekEntryDialogProps = { state: { mode: "create"; date: string; prefillStart: string } | { mode: "edit"; entry: CalendarEntryView } | null; onClose: () => void }`。

**失败测试(组件):** create 模式开始时间预填 `prefillStart`、结束留空、日期锁定;edit 模式预填原值;删除按钮先弹 AlertDialog 二次确认,确认后调 `deleteEntryAction`,取消不调;保存成功触发 `onClose`。

**预期失败:** 组件不存在。

**提交:** `feat(calendar): 周视图编辑卡(创建预填/编辑/删除二次确认)`

### Task 8: WeekView 主体

**Files:** Create `src/modules/calendar/components/WeekView.tsx` · Test `tests/calendar/components/WeekView.test.tsx`(Create)

**Interfaces:** Consumes `WeekDay`(Task 1)、`layoutDayBlocks` / `WeekBlock`(Task 2)、WeekEntryDialog(Task 7)、i18n `calendar.week.*`(Task 3)、`CalendarEntryView`(既有)。Produces `WeekViewProps = { days: WeekDay[]; entries: CalendarEntryView[] }`,默认导出 `WeekView`(page 消费)。

**失败测试(组件):** 整周无条目渲染 E-04 逐字文案;全天区条目展示于表头横栏且时间网格无对应色块;带时间条目色块文字与时段可读(按列与时段定位断言);实时线:`days` 含 isToday 渲染、不含不渲染(Review Focus 5);槽位 button `aria-label` 含星期与钟点(`createAt` 插值)。

**实现:** AllDayRow / TimeGrid / NowLine 为文件内子组件;窄屏单横滚容器、列最小宽度、全天区与表头随容器同步(D-09);初始滚动锚定当前时段,非今天周锚 08:00(D-10)。

**提交:** `feat(calendar): 周视图主体(时间网格/全天区/实时线/空态)`

### Task 9: /calendar 路由错误边界

**Files:** Create `src/app/(app)/calendar/error.tsx` · Test `tests/calendar/components/CalendarErrorBoundary.test.tsx`(Create)

**Interfaces:** Consumes i18n `loadFailed / retry`(Task 3)。Produces 客户端错误边界(默认导出,`{error, reset}`);page DB 异常上抛至此呈现 E-05。

**失败测试(组件):** 渲染 E-05 逐字文案与「重试」按钮;点击重试调用 `reset()`;不泄漏 error.message 给用户。

**预期失败:** error.tsx 不存在。

**提交:** `feat(calendar): /calendar 路由错误边界(E-05 + 重试)`

### Task 10: page 组装 + E2E 演示态 1–5

**Files:** Modify `src/app/(app)/calendar/page.tsx` · Test Create `e2e/calendar-week.spec.ts`

**Interfaces:** Consumes `WeekView`(Task 8)、`listWeekEntries`(Task 4)、`isValidWeekStart / addWeeks / weekStartFor`(Task 1)、i18n `viewWeek / viewMonth / prevWeek / nextWeek / today`(Task 3)、`CalendarScreen / parseMonthParam / addMonths`(既有)。

**AC / 演示态:** AC-1..AC-6 / 演示态 1–5(R1–R6、R8、R10、R11);路由行为 #2/#3。

**失败测试(E2E):** 直达 `/calendar` 默认今天所在周 + 实时线在场 + 既有条目色块可读(态1);翻上周实时线消失、「今天」恢复(态1);375px 视口横滚且全天区/表头可见(态1,R8);点周三 14:30 槽 → 卡内预填 "14:30" → 保存后色块出现(态2);点色块编辑/删除二次确认(态3);无时间条目仅全天区(态4);空周 E-04 逐字、周↔月切换数据一致且切回保持所在周、URL 路径恒为 `/calendar`(态5)。

**预期失败:** 页面仍为纯月视图,周选择器/色块/切换控件缺失。

**实现:** searchParams 解析(无 `view` → 周;`?week=` 经 `isValidWeekStart` 采纳,非法回退今天所在周;`view=month` 走既有 `parseMonthParam` 分支)、ViewToggle 分段 Links(月 → `?view=month&month=<当前月>&week=<锚点>`)、周导航 prev/today/next Links、数据分支 `listWeekEntries | listMonthEntries`、渲染 `WeekView | CalendarScreen`。

**提交:** `feat(calendar): /calendar 默认周视图与周/月切换(E2E 演示态 1–5)`

### R ↔ 任务索引

R1→T1/T10 · R2→T8/T10 · R3→T7/T10 · R4→T2/T7/T10 · R5→T8/T10 · R6→T8/T10 · R7→T4 · R8→T8/T10 · R9→T9 · R10→T10 · R11→T1/T10

## 执行链

| 链 | 任务序列 | 文件域 | 并行性 |
| ---- | ---- | ---- | ---- |
| 链A 纯函数与查询 | Task 1→2→4 | `src/modules/calendar/{week,queries}.ts`、`tests/calendar/week.test.ts`、`tests/integration/calendar/queries.test.ts` | 与链B/链C 并行 |
| 链B i18n | Task 3 | `src/locales/*.json`、`tests/calendar/locales.test.ts` | 与链A/链C 并行 |
| 链C 组件族 | Task 5→6→7→8→9 | `src/components/ui/dialog.tsx`、`src/modules/calendar/components/{EntryForm,WeekEntryDialog,WeekView}.tsx`、`src/app/(app)/calendar/error.tsx`、`tests/calendar/components/*` | 与链A/链B 并行 |
| 链D 组装与 E2E | Task 10 | `src/app/(app)/calendar/page.tsx`、`e2e/calendar-week.spec.ts` | 收尾:待链A(1/2/4)、链B(3)、链C(8)完成 |

## 机检自查

- [x] 需求承载对照每条 R 能指向任务编号(R ↔ 任务索引)
- [x] 每个契约的错误情形至少一条失败测试(listWeekEntries DB 上抛→T4/T9;actions 判别联合→T7 组件测试)
- [x] 每条可测接缝至少一个任务(testing.md 全部接缝已入卡)
- [x] 无状态转换(唯一状态沿承);每个演示态至少一个 E2E 任务(态1–5→T10)
- [x] 执行链覆盖全部任务(1–10),链间文件域不相交
- [x] 「不安排任务」与 design 非目标逐条一致(5/5),无预留任务
- [x] 任务卡无函数体、无空话
- [x] 跨任务名字/类型与 Produces 一致(WeekDay/WeekBlock/listWeekEntries/WeekViewProps 逐一核对)
- [x] Review Focus 5 行,每行有测试固定(对应任务已标注)
- [x] Q 条目无验证任务(Global Constraints 已注明去向)
- [x] 任务卡正文均 ≤15 行

## 裁决记录

(执行期偏离在此登记:`裁决: <决定> — <原因> — <代价>`)

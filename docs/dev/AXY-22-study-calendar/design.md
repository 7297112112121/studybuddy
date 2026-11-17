---
title: 'Design: AXY-22 个人日程日历'
description: 个人日程日历的架构设计(数据模型/契约/UI/组件)
sidebar_position: 2
---

# Design: AXY-22 个人日程日历

| 对应 Proposal | [AXY-22](../../product/AXY-22-study-calendar/proposal) | 状态 | 已批准 |
| ---- | ---- | ---- | ---- |
| 日期 | 2026-11-17 | 批准人 | 海渝(2026-11-17) |

## 架构总览

AXY-22 是纯 CRUD + 简单校验的模块(代码目录轴 1 阶段 0),按 auth 三段式样板立 `src/modules/calendar/`(schema/queries/service/actions + components/),不预建 `domain/`。路由 `/calendar` 落 `src/app/(app)/calendar/`,继承 `(app)/layout.tsx` 既有服务端会话守卫(AXY-8 底座,零新增守卫代码)。读走 RSC props 下行、写走 Server Actions + `revalidatePath`(ADR-0025 基线流,不引入 TanStack Query——无轮询、无乐观更新);月导航经 URL searchParams 由服务端重取。月视图网格与当日详情为模块私有 Client 组件,删除二次确认用 shadcn `alert-dialog`;条目数据一律不进 zustand(ADR-0009)。

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置(不覆盖/不引入的概念) |
| ---- | ---- | ---- |
| 1 | 重复事件(每周/每日自动出现同一安排) | 不覆盖;不引入重复规则字段、不引入重复展开逻辑,表结构无 recurrence 类字段 |
| 2 | 到点提醒 / 通知 | 不覆盖;不引入通知/调度接口、不引入后台任务,无任何定时器或队列概念 |
| 3 | AI 自动排期接入 | 不覆盖;模块不设 `tools.ts`(不向 agent 暴露日历工具),无 AI 介入路径;将来对接另立故事 |
| 4 | 共享 / 协作、多日历 / 清单文件夹 | 不覆盖;单表单日历,无日历/文件夹实体、无共享字段与协作者概念 |

> 分类 / 标签 / 颜色:proposal C-01 已裁定「本期不做」,同上不引入任何分类/标签/颜色字段。

## 数据模型

单实体单表,无关系图。迁移经 `npm run db:generate`(drizzle-kit)落在 `src/db/migrations/<UTC时间戳>_<代号>/`;属主文件为 `src/modules/calendar/schema.ts`(与 auth 先例一致),经 `src/db/schema.ts` barrel `export *` 暴露——代码目录「公共层」表中 `db/schema/<模块>.ts` 的表述与 auth 已落地先例矛盾,建议随本特性 PR 修订该行(见开放问题 #1)。种子数据:无(空表);路径常量:`ROUTES.calendar: "/calendar"` 加在 `src/lib/routes.ts`。

| 实体 | 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| calendar_entry | id | uuid | PK,`defaultRandom()` | 非规范业务主键;表结构采用 drizzle-orm 1.0 RC `snakeCase.table`,camelCase 属性名烘焙为 snake_case 列名 |
| calendar_entry | userId | text | notNull,复合索引首列 | 归属 Better Auth `user.id`(text)。**不建 DB 级 FK**(裁决:跨模块引用须经 `src/db/schema.ts` barrel,构成 barrel 自引用循环;且产品无删除账号流程);账号隔离由应用层 `user_id` 过滤保证(R7) |
| calendar_entry | entryDate | date(`mode: 'string'`) | notNull,复合索引次列 | 所属日期(F-04),字面日期 `YYYY-MM-DD`,无时区换算;过去/未来任意合法日期均可(边界 #4) |
| calendar_entry | title | text | notNull | 事项文本(F-01),1—50 字约束在 zod 层(表列不限长,50 上限由契约保证) |
| calendar_entry | startTime | time | nullable | 开始时间(F-02),`HH:MM` 分钟粒度(存储 `HH:MM:SS`,查询层归一为 `HH:MM`);null = 不带时间条目 |
| calendar_entry | endTime | time | nullable | 结束时间(F-03);null 或晚于 startTime;「与开始同属所选日期、不跨午夜」由模型天然保证——时间只是所属日期内的时刻,无跨日 datetime 字段 |
| calendar_entry | createdAt | timestamp(`withTimezone: true`) | notNull,`defaultNow()` | 与 auth 表同约定 |
| calendar_entry | updatedAt | timestamp(`withTimezone: true`) | notNull,`defaultNow()` | 同上 |

索引:`index("calendar_entry_user_date").on(t.userId, t.entryDate)`——唯一查询模式是「按账号 + 日期区间取月」。

实体状态:唯一状态「已记录」,无状态字段、无状态流转(与 proposal 领域模型「创建即存在,删除即消失」一致),故不附状态转换表。

## 契约

只覆盖跨模块/跨层接口与需单测的核心函数;组件内部结构不写契约。

```ts
// ── src/modules/calendar/schema.ts ── 表定义见「数据模型」;zod 契约(前后端共用单一来源):
export const TIME_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** zod message 直接承载 i18n key(沿 auth messageKey 模式,ADR-0010)。 */
export const calendarEntryInputSchema = z
  .object({
    date: z.string().refine(isValidDateString, { message: "calendar.error.invalidDate" }), // F-04
    title: z
      .string()
      .min(1, { message: "calendar.error.titleRequired" }) // E-01
      .max(50, { message: "calendar.error.titleTooLong" }), // F-01 后端兜底(UI 已被 maxLength=50 挡住)
    startTime: z.string().regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" }).nullable(), // F-02
    endTime: z.string().regex(TIME_HHMM_RE, { message: "calendar.error.invalidTime" }).nullable(),   // F-03
  })
  // F-03:开始留空时结束不得有值(服务端半边;UI 半边是控件禁用)
  .refine((v) => v.endTime === null || v.startTime !== null, {
    path: ["endTime"],
    message: "calendar.error.endTimeAfterStart",
  })
  // F-03/E-03:结束须晚于开始;零填充 HH:MM 字符串比较即时间比较
  .refine((v) => v.startTime === null || v.endTime === null || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "calendar.error.endTimeAfterStart",
  });

export type CalendarEntryInput = z.infer<typeof calendarEntryInputSchema>;

/** 字段级错误:键为字段,值为 i18n messageKey(前端渲染 E 文案的唯一来源)。 */
export type CalendarFieldErrors = Partial<Record<"date" | "title" | "startTime" | "endTime", string>>;
```

```ts
// ── src/modules/calendar/month.ts ── 日历数学纯函数,零 IO,单元测试直接驱动
export type MonthCell = { date: string; inMonth: boolean; isToday: boolean };

/** 6 行 × 7 列月网格,周一为每周首日;含邻月补位格(inMonth=false)。 */
export function buildMonthGrid(year: number, month: number, today: string): MonthCell[];

/** 该月日期闭区间 "YYYY-MM-DD"(listMonthEntries 查询入参的单一来源)。 */
export function monthRange(year: number, month: number): { start: string; end: string };

/** 月份加减,month 1–12,自动进退位。 */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number };

/** 严格校验 "YYYY-MM-DD":格式合法且为真实存在的日历日(拒收 2026-02-30)。 */
export function isValidDateString(value: string): value is string;

/** "HH:MM:SS" → "HH:MM"(time 列查询结果归一)。 */
export function formatHhmm(time: string): string;
```

```ts
// ── src/modules/calendar/queries.ts ── 读路径,RSC page 直接调用
export type CalendarEntryView = {
  id: string;
  date: string; // entryDate,"YYYY-MM-DD"
  title: string;
  startTime: string | null; // "HH:MM" 或 null
  endTime: string | null;   // "HH:MM" 或 null
};

/** 按账号 + 月区间读条目(仅本人——R6/R7 的数据半边);排序:entryDate 升序,
 *  同日不带时间在前、带时间按 startTime 升序(演示态 4「按开始时间先后并列」)。 */
export async function listMonthEntries(userId: string, year: number, month: number): Promise<CalendarEntryView[]>;
```

```ts
// ── src/modules/calendar/service.ts ── 写路径,入参假定已经 zod 校验
/** 单行 INSERT;DB 异常向上抛,由 action 归一为 SAVE_FAILED。 */
export async function createEntry(userId: string, input: CalendarEntryInput): Promise<void>;

/** 单行 UPDATE,WHERE id = entryId AND user_id = userId;false = 条目不存在或不属该用户(R7)。 */
export async function updateEntry(userId: string, entryId: string, input: CalendarEntryInput): Promise<boolean>;

/** 单行 DELETE,同 WHERE;false = 条目不存在或不属该用户(R7)。 */
export async function deleteEntry(userId: string, entryId: string): Promise<boolean>;
```

```ts
// ── src/modules/calendar/actions.ts ── 'use server',判别联合返回(ADR-0025)
export type CalendarEntryActionResult =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: CalendarFieldErrors } // E-01 / E-03 由 fieldErrors 承载
  | { ok: false; error: "UNAUTHORIZED" }                                    // 无有效会话,客户端跳 /login
  | { ok: false; error: "NOT_FOUND" }                                       // 条目不存在或不属该用户,客户端静默刷新
  | { ok: false; error: "SAVE_FAILED" };                                    // E-02

export async function createEntryAction(input: CalendarEntryInput): Promise<CalendarEntryActionResult>;
export async function updateEntryAction(entryId: string, input: CalendarEntryInput): Promise<CalendarEntryActionResult>;
export async function deleteEntryAction(entryId: string): Promise<CalendarEntryActionResult>;
// 统一流程:getCurrentSession → 无会话返回 UNAUTHORIZED;zod safeParse 复验 → INVALID_INPUT;
// service 调用成功 → revalidatePath(ROUTES.calendar) → { ok: true };异常 → SAVE_FAILED。
// 返回错误 key,不返回文案原文(ADR-0010)。
```

| 契约 | 调用方 | 被调方 | 错误情形 |
| ---- | ---- | ---- | ---- |
| `calendarEntryInputSchema.safeParse` | EntryForm(客户端)/ 三个 action(服务端) | schema.ts | title 空 → E-01 key;end ≤ start 或 start 空而 end 有值 → E-03 key;date/time 非法 → 防御性 key |
| `listMonthEntries` | `calendar/page.tsx`(RSC) | queries → db | DB 异常向上抛,页面渲染失败(Next 错误边界兜底) |
| `createEntry` / `updateEntry` / `deleteEntry` | actions.ts | service → db | DB 异常抛出 → action 转 SAVE_FAILED;update/delete 未命中返回 false |
| `createEntryAction` / `updateEntryAction` / `deleteEntryAction` | EntryForm / EntryRow(客户端) | actions → service | 见判别联合四种 `ok:false` |
| `buildMonthGrid` / `monthRange` / `addMonths` / `isValidDateString` / `formatHhmm` | MonthGrid、page.tsx、schema.ts | month.ts(纯函数) | 不抛错,入参非法由 `isValidDateString`/正则拦截 |

路由行为落点表:

| 路由行为 # | 实现位置(函数/守卫/组件) | 错误情形 |
| ---- | ---- | ---- |
| 1 | `src/app/(app)/layout.tsx` 的 `AppLayout`(既有,零改动):`getCurrentSession()` 为 null → `redirect(ROUTES.login)`;`calendar/page.tsx` 自带 `export const instant = false`(cacheComponents 豁免,与 workbench 同) | 未登录响应不含日历页内容(R9) |
| 2 | `src/app/(app)/workbench/page.tsx` 新增 `<Link href={ROUTES.calendar}>`(文案经 i18n),落在既有 `<main>` 内,不改 SignOutButton 等既有行为(D-06) | 无 |

## UI 与组件

1. **路由/页面**(含视图切换):`/calendar` → `src/app/(app)/calendar/page.tsx`(RSC,`instant = false`)。searchParams `?month=YYYY-MM` 决定展示月,缺省为服务器当前月、非法值回退当前月;月导航为「上一月 / 下一月」服务端 `<Link>`(href 带相邻月 query,经 `monthRange`/`addMonths` 计算),RSC 重取,无客户端路由状态;无视图切换(D-01)。页面取 `getCurrentSession()` 得 userId,调 `listMonthEntries(userId, year, month)` 与服务器 `today` 串,props 下行。

2. **组件树与既有组件复用关系**(均在 `src/modules/calendar/components/`,除注明外为 Client 组件):
   - `CalendarScreen.tsx`(Client)——顶层组装;持有 `selectedDate`(本地 `useState`,纯 UI 态,不入 zustand、不入服务端缓存;换月时回落:今日在该月则选中今日,否则选中该月 1 日)。
   - `MonthGrid.tsx`(Client)——消费 `buildMonthGrid(year, month, today)` 渲染 6×7 网格;今日格常亮、选中格独立样式可区分(语义 token,新色先进 `@theme`,ADR-0003);每格渲染当天条目摘要行(带时间「HH:MM title」、不带时间「title」),每格最多 2 条,超出以「+N」计数(纯展示细节,E2E 断言详情面板而非月格截断);点击日期格 → `selectedDate` 切换。
   - `DayPanel.tsx`(Client)——标题「M月D日 · 今天」(今日)/「M月D日」(其余);当日条目列表(`EntryRow`);无条目空态文案(R6);底部嵌 `EntryForm`。
   - `EntryRow.tsx`(Client)——条目行(「HH:MM–HH:MM title」/「title」)+「编辑」「删除」;删除触发 shadcn `AlertDialog` 二次确认(D-08,确认层无额外输入);编辑切 `EntryForm` 编辑模式。
   - `EntryForm.tsx`(Client)——新建/编辑复用(演示态 3:编辑预填原值);复用既有 `src/components/ui/` 的 button/input/label;**需新增安装 shadcn `alert-dialog`**(实现期经 shadcn CLI/MCP 查 registry 落地,ADR-0004)。

3. **表单与交互状态**:
   - 事项文本(F-01):`maxLength={50}` 输入框硬上限(前端半边)+ zod `max(50)`(后端兜底);留空 → E-01。
   - 开始时间(F-02):原生 `<input type="time">`(minute 粒度);结束时间(F-03):原生 `<input type="time">`,**开始留空时该控件 `disabled`**(F-03,EntryForm 本地态);「与开始同属所选日期、不跨午夜」由数据模型天然保证(见数据模型节)。
   - 所属日期(F-04):新建模式不显示(由选中天决定);编辑模式显示原生 `<input type="date">`(R11 改期入口;选原生控件避免引入 popover+calendar 组件组合)。
   - 校验落点:**单一来源** = `calendarEntryInputSchema`(schema.ts),客户端 `EntryForm` 与服务端 action 共用 `safeParse`——与 auth「validators.ts + schema.ts 双文件」不同,calendar 规则简单,单一来源消除双份同步负担;不设 validators.ts。
   - 错误呈现位置:E-01 在事项文本字段下方;E-03 在结束时间字段下方;E-02 在表单提示区;校验失败修正后即时消除(重跑 safeParse)。
   - 提交中(R12):EntryForm 本地 `isPending` 态,提交按钮置灰 `disabled`,不可重复提交;保存失败呈 E-02 且列表不变(数据仅经 revalidate 后的服务端数据)。
   - 显示/隐藏:删除确认 AlertDialog open 态(EntryRow 本地)。
   - 文案落位(ADR-0010,新建 `src/locales/zh-CN/calendar.json`,逐字对应 E 表):`calendar.error.titleRequired`「请填写事项内容」(E-01)、`calendar.error.saveFailed`「保存失败,请重试」(E-02)、`calendar.error.endTimeAfterStart`「结束时间需晚于开始时间」(E-03)、`calendar.empty.day`「这天还没有安排」(R6)、`calendar.page.title`「日程日历」、`calendar.entryPoint`「日程日历」(工作台入口);另有防御性 key(不在 E 表,正常 UI 流不可触发):`titleTooLong` / `invalidDate` / `invalidTime`,为 F-01/F-04/F-02 后端半边的兜底文案。

4. **演示态 ↔ AC 映射**(proposal 演示态 1–5,无演示专态):

   | 演示态 | AC | 承载组件 |
   | ---- | ---- | ---- |
   | 1 月视图与当日详情(空态) | AC-6 | MonthGrid + DayPanel(空态文案) |
   | 2 创建条目(带 / 不带时间) | AC-1、AC-2 | EntryForm(R12 提交态含内) |
   | 3 编辑与删除 | AC-3 | EntryRow(AlertDialog)+ EntryForm 编辑模式(含所属日期) |
   | 4 时间重叠并存 | AC-4 | DayPanel 排序展示(queries 排序契约) |
   | 5 过去日期补记 | AC-5 | MonthGrid 选过去天 + EntryForm |

5. **守卫归属**:全部在 Server 层,Client 组件不承担守卫。路由级:`(app)/layout.tsx` AppLayout 既有 redirect(R9);action 级:三个 calendar action 各自 `getCurrentSession()`,无会话返回 `UNAUTHORIZED`,客户端收到后 `router.replace(ROUTES.login)`(R7 的接口半边);页面级:page.tsx 取 session 供 userId。无回退/直开分支——守卫行为与 AXY-8 完全同款,不新增逻辑。

## 错误与边界处理

**表一 · proposal 边界表对应**

| proposal 边界项 | 处理方式 | 落点(组件/函数) |
| ---- | ---- | ---- |
| 1 | 事项文本双重校验:前端 zod safeParse + 后端 action 复验;50 字硬上限由 `maxLength` 挡住,不做提交时字符过滤(D-07) | EntryForm + `calendarEntryInputSchema` |
| 2 | 时间规则:`type="time"` 原生控件(F-02 分钟粒度);开始留空结束禁用(F-03);end > start 由 zod refine(零填充字符串比较) | EntryForm(disabled 半边)+ schema(refine 半边) |
| 3 | 同一日期时间段可重叠,不做冲突校验与提示(D-05):service 无任何重叠检查,直接写入 | service.ts(无检查即实现);R4 集成断言 |
| 4 | 所属日期不限今天:entryDate 仅验「真实存在的日历日」,无过去/未来域限制 | `isValidDateString` + schema |
| 5 | 会话与守卫复用 AXY-8 底座(ADR-0013):路由级 redirect + action 级会话拒绝,未登录拦截为服务端行为 | AppLayout + 三个 action 内 `getCurrentSession` |
| 6 | 工作台承接页仅新增入口链接,不改已批准行为(D-06) | `workbench/page.tsx` 新增 `<Link>`;其余零改动 |
| 7 | 保存失败原子性:每次写操作为单条 SQL(单行 INSERT/UPDATE/DELETE),天然原子,无半写状态;失败抛出 → action 转 E-02,原数据不变 | service.ts + actions.ts |

**表二 · E 表映射**

| E 编号 | 产出函数/组件 | 呈现位置(字段下/表单提示区/勾选框旁) | 关联 R |
| ---- | ---- | ---- | ---- |
| E-01 | `calendarEntryInputSchema`(title min)→ fieldErrors.title → EntryForm 渲染 | 事项文本字段下方 | R8 |
| E-02 | action `SAVE_FAILED` → EntryForm 表单提示区(客户端映射 i18n key) | 表单提示区 | R12 |
| E-03 | `calendarEntryInputSchema`(两个 endTime refine)→ fieldErrors.endTime → EntryForm 渲染 | 结束时间字段下方 | R8 |

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | ---- |
| R1 | EntryForm 创建带时间条目 → `createEntryAction` → `createEntry`;创建后 `revalidatePath` 使详情与月格摘要即时更新 | E2E:`e2e/calendar.spec.ts` 创建「高数复习」14:00–15:30 → 详情与月格断言 |
| R2 | EntryForm 仅填 title 提交(startTime/endTime 为 null)→ 同上链路;DayPanel 渲染不带时间行 | E2E:仅填「交英语作业」→ 该天无时间显示、与带时间条目并存断言 |
| R3 | EntryRow「编辑」(EntryForm 编辑模式)与「删除」(AlertDialog 二次确认)→ `updateEntryAction`/`deleteEntryAction`;变更后 revalidate 即时生效 | E2E:编辑即时更新断言;删除确认后条目消失、取消保留断言 |
| R4 | service 无重叠检查(边界 #3),同日重叠时间段两行并存;DayPanel 按 startTime 升序并列展示 | 集成:`tests/integration/calendar/service.test.ts` 同日 14:00–15:30 与 14:30–15:00 均写入成功;E2E:无冲突提示断言 |
| R5 | entryDate 无日期域限制(边界 #4);月视图选过去天 + EntryForm 创建 | E2E:对昨日创建 → 归入昨日、月格摘要同步断言 |
| R6 | `listMonthEntries` 以 userId 过滤仅取本人条目;DayPanel 无条目渲染空态文案 | 集成:甲登录 `listMonthEntries` 不含乙条目断言;E2E:空态文案「这天还没有安排」呈现断言 |
| R7 | 三层隔离:queries/service 全部带 userId 条件;action 会话取 userId,不收客户端传入的 userId;`updateEntry`/`deleteEntry` WHERE 含 user_id | 集成:以乙 userId 调 `updateEntry`/`deleteEntry`(甲的 entryId)→ false;乙会话 `listMonthEntries` 无甲条目(接口层越权断言) |
| R8 | 前后端共用 `calendarEntryInputSchema`(单一来源);F-03 结束控件禁用落 EntryForm | 单元:`tests/calendar/schema.test.ts` E-01/E-03 逐项;组件测试:`tests/calendar/components/EntryForm.test.tsx` 开始留空 → 结束 disabled;E2E:留空提交 E-01、14:00+14:00 提交 E-03 断言 |
| R9 | `(app)/layout.tsx` AppLayout 既有服务端守卫(路由行为 #1,零新增代码) | E2E:未登录直达 `/calendar` → 落于 `/login` 且响应无日历内容断言 |
| R10 | `workbench/page.tsx` 新增 `<Link href={ROUTES.calendar}>`(路由行为 #2,D-06) | E2E:登录后工作台可见「日程日历」入口,点击落于 `/calendar` 当前月断言 |
| R11 | EntryForm 编辑模式含所属日期 `<input type="date">`(F-04)→ `updateEntryAction` 修改 entryDate | E2E:11-16 条目改期至 11-18 → 原 11-16 消失、11-18 出现断言 |
| R12 | EntryForm `isPending` 置灰防重复提交;`SAVE_FAILED` → E-02 且列表不变(边界 #7 单条 SQL 原子性) | E2E:提交中重复点击不产生重复条目;模拟保存失败 → E-02 呈现且原列表不变断言 |

## 测试接缝

proposal R 表出现的测试层:单元(校验函数)、集成(接口层越权/重叠并存)、E2E(其余全部);无人工抽检条目。

| 测试层(单元/集成/E2E/人工抽检) | 接缝(函数/路由/接口) | 断言要点 | 关联 R |
| ---- | ---- | ---- | ---- |
| 单元 | `tests/calendar/schema.test.ts` → `calendarEntryInputSchema.safeParse` | 空 title → `calendar.error.titleRequired`;end ≤ start 与「start 空而 end 有值」→ `calendar.error.endTimeAfterStart`;title 51 字 → `titleTooLong`;合法 `HH:MM` 边界(00:00 / 23:59)通过;`2026-02-30` → invalidDate | R8 |
| 单元 | `tests/calendar/month.test.ts` → `buildMonthGrid` / `monthRange` / `addMonths` / `isValidDateString` / `formatHhmm` | 6×7 网格与邻月补位、周一首日、跨年月加减、闰月 2 月、`isValidDateString` 拒收非法日 | R1/R5(支撑函数) |
| 单元(组件) | `tests/calendar/components/EntryForm.test.tsx` | 开始留空 → 结束控件 disabled;填开始 → 恢复可输;提交中按钮 disabled;E-01/E-03 文案在对应字段下方渲染 | R8、R12 |
| 集成 | `tests/integration/calendar/service.test.ts` → `createEntry` / `updateEntry` / `deleteEntry` / `listMonthEntries` | R7:乙 userId 调甲 entryId 的 update/delete → false,listMonthEntries 无甲条目;R4:同日重叠两行均成功;R5:过去日期可写;R6:查询仅返回本人条目 | R4、R5、R6、R7 |
| 集成 | `tests/integration/calendar/actions.test.ts` → `createEntryAction` / `updateEntryAction` / `deleteEntryAction` | 无会话 → UNAUTHORIZED;非法入参 → INVALID_INPUT + fieldErrors key;update/delete 未命中 → NOT_FOUND;成功后 revalidate 不抛 | R7、R8 |
| 集成 | `tests/integration/calendar/migration.test.ts` → drizzle 迁移 applied 状态 | `calendar_entry` 表、列类型、`calendar_entry_user_date` 索引存在 | —(结构兜底) |
| E2E | `e2e/calendar.spec.ts` → `/calendar` 路由 | R1/R2 创建(带/不带时间)、R3 编辑删除(二次确认)、R4 重叠并存、R5 过去补记、R6 空态、R8 校验文案、R9 未登录重定向、R10 工作台入口、R11 改期、R12 提交态与保存失败 | R1–R3、R5、R6、R8–R12 |

## 与 ADR 的关系

| 涉及技术 | ADR | 一致性 |
| ---- | ---- | ---- |
| Next.js 16 App Router(`(app)` 路由组、searchParams、instant 豁免) | ADR-0001 / 0002 | 一致 |
| Tailwind CSS 4 语义 token(今日/选中格样式如有新色先进 `@theme`) | ADR-0003 | 一致 |
| shadcn/ui(复用 button/input/label,新增安装 alert-dialog;月网格为模块私有组件) | ADR-0004 | 一致 |
| PostgreSQL 17(单表、date/time 列) | ADR-0005 | 一致 |
| Drizzle ORM(snakeCase 表定义、drizzle-kit 迁移、schema 推导 zod) | ADR-0006 | 一致 |
| zustand(条目数据不入 zustand;选中日期/表单草稿为组件本地 UI 态) | ADR-0009 | 一致 |
| next-intl(E 表与空态文案入 `locales/zh-CN/calendar.json`,action 返回错误 key) | ADR-0010 | 一致 |
| Vitest(校验纯函数单元 + 真实 PG 集成) | ADR-0012 | 一致 |
| Better Auth 会话(守卫复用 `getCurrentSession`,action 内各自取会话按入口拒绝) | ADR-0013 | 一致 |
| Playwright E2E(异步 RSC 页面补位) | ADR-0017 | 一致 |
| TanStack Query + Server Actions(写走 Server Actions + revalidatePath 基线流;**本期不引入 TanStack Query**——无轮询、无乐观更新。判定条件:实现期若引入乐观更新/onMutate 对账,须经 plan 裁决记录再引入) | ADR-0025 | 一致 |
| 模块三段式与目录安排(`src/modules/calendar/`,schema 属主在模块内 + `src/db/schema.ts` barrel) | 代码目录文档(非 ADR) | 一致(按 auth 先例);文档「公共层」表 `db/schema/<模块>.ts` 表述与先例矛盾,登记澄清建议(开放问题 #1),无需新 ADR |

**Q 条目去向**:本设计不含 Q1(`/calendar` 首屏可交互 ≤ 2s)与 Q2(条目 CRUD 接口 p95 ≤ 500ms)的验证,二者由测试提质阶段验收(spec-review 不核对)。

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---- | ---- |
| 1 | `db/schema` 属主文件位置的仓库级约定如何统一(模块内 vs `db/schema/<模块>.ts`) | 不阻塞本设计(已按 auth 先例裁决:属主在 `src/modules/calendar/schema.ts`) | 声明裁决:跟 auth 先例;建议随本特性 PR 修订代码目录文档「公共层」表一行,消除文档自相矛盾 |
| 2 | 「今天」/当前月按时区如何判定 | 不阻塞数据正确性(entryDate 为用户所选字面日期,不受时区换算影响) | 声明假设:单时区(服务器时区 = 用户本地时区,ADR-0016 单机自托管场景)。影响范围:今日高亮、默认月/默认选中天。将来出现跨时区用户时另立故事 |
| 3 | 是否引入 TanStack Query | 不阻塞任何 R(R3/R12 的「即时生效」由 revalidatePath 基线流满足) | 已裁决:本期不引入;判定条件见「与 ADR 的关系」ADR-0025 行 |

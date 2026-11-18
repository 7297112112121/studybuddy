---
title: 'Design: AXY-23 日程周视图 · 数据与契约'
description: 日程周视图的数据模型(零迁移)与契约(签名级,含路由行为落点表)
sidebar_position: 3
---

# Design: AXY-23 日程周视图 · 数据与契约

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 数据模型

**零迁移、零 schema 改动**:`calendar_entry` 表(属主 `src/modules/calendar/schema.ts`,barrel `src/db/schema.ts` re-export)原样沿用——实体、属性、唯一状态「已记录」均与 AXY-22 design 口径一致(proposal 11.2 领域模型「零模型增量」的技术落点)。无状态字段,无状态转换表。无种子数据;路由常量不新增(`ROUTES.calendar` 既有)。

## 契约

只覆盖跨层接口与需单测的核心函数;WeekView 内部渲染细节不设契约。

### 新增纯函数:`src/modules/calendar/week.ts`

零 IO、零日期库,与 `month.ts` 同风格:字面日期 `"YYYY-MM-DD"`、分钟数 0–1439;禁止本地时区换算。

```ts
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeekDay = { date: string; weekdayKey: WeekdayKey; isToday: boolean };

/** date("YYYY-MM-DD") → 该日所在周的周一("YYYY-MM-DD",周一恒等)。 */
export function weekStartFor(date: string): string;

/** 周一锚点 → 周内 7 天(列序周一首,weekdayKey 依列序;isToday 对照 today)。 */
export function buildWeekDays(weekStart: string, today: string): WeekDay[];

/** 周一锚点 → 该周闭区间(周一..周日,"YYYY-MM-DD"),listWeekEntries 入参来源。 */
export function weekRange(weekStart: string): { start: string; end: string };

/** 周一锚点 ± delta 周(跨月/跨年由 UTC 毫秒运算兜住)。 */
export function addWeeks(weekStart: string, delta: number): string;

/** 严格校验:合法 "YYYY-MM-DD" 且确为周一(?week= wire 格式约束)。 */
export function isValidWeekStart(value: string): value is string;

/** "HH:MM" → 当日分钟数 0–1439(非法输入抛 RangeError,仅内部可信输入)。 */
export function timeToMinutes(time: string): number;

/** 点击位置分钟数 → 所在 30 分钟槽起点 "HH:00"/"HH:30"(向下取整,F-05)。 */
export function slotPrefillStart(minutes: number): string;

export type WeekBlock = {
  entryId: string;
  /** 列内横向偏移与宽度(百分比;同一重叠簇内并列均分,proposal 边界 #2)。 */
  leftPercent: number; // 0–100
  widthPercent: number; // 0–100
  /** 距 00:00 分钟偏移与时长(时间点条目 durationMinutes 固定 30,D-12)。 */
  startMinutes: number; // 0–1439
  durationMinutes: number; // 结束-开始;仅开始时间时 = 30
};

/** 单日带时间条目(startTime 非 null)→ 网格布局块;重叠簇均分列宽,入参顺序无关。 */
export function layoutDayBlocks(
  dayEntries: CalendarEntryView[],
): WeekBlock[];
```

### 新增查询:`src/modules/calendar/queries.ts`(既有文件追加)

```ts
/** 按账号 + 周区间(weekRange)读条目;排序与 listMonthEntries 一致
 *  (entryDate 升序,同日 compareEntries);恒带 userId 条件(R7)。 */
export async function listWeekEntries(
  userId: string,
  weekStart: string,
): Promise<CalendarEntryView[]>;
```

### 既有契约复用(不修改签名)

| 复用物 | 来源 | 周视图用法 |
| ---- | ---- | ---- |
| `createEntryAction / updateEntryAction / deleteEntryAction` | `modules/calendar/actions.ts` | WeekEntryDialog 原样调用;判别联合 `CalendarEntryActionResult` 原样处理 |
| `calendarEntryInputSchema / CalendarEntryInput / CalendarFieldErrors` | `modules/calendar/schema.ts` | 前后端校验单一来源,零改动 |
| `EntryForm`(新增可选 prop `showDateField?: boolean = true`) | `components/EntryForm.tsx` | 周视图传 `false`:隐藏日期控件,日期锁定所在列(create=列日期,edit=原日期);其余行为(校验呈现、isPending、onSaved)不变 |
| `Button / Input / Label / AlertDialog` | `components/ui/` | 原样复用 |

### 新增组件:`src/modules/calendar/components/`(签名级 props)

```tsx
// WeekView.tsx("use client")
type WeekViewProps = {
  days: WeekDay[]; // 恰 7 项,page.tsx 经 buildWeekDays 产出
  entries: CalendarEntryView[]; // 该周全部条目(listWeekEntries 结果)
};
export default function WeekView({ days, entries }: WeekViewProps): ReactElement;

// WeekEntryDialog.tsx("use client")
type WeekEntryDialogProps = {
  state:
    | { mode: "create"; date: string; prefillStart: string } // F-05 预填
    | { mode: "edit"; entry: CalendarEntryView }
    | null;
  onClose: () => void;
};
export default function WeekEntryDialog(props: WeekEntryDialogProps): ReactElement;

// error.tsx(app 层,"use client")
// 页面级错误边界:渲染 E-05 文案 +「重试」Button(reset()),无 props。
```

### 路由行为落点表

| 路由行为 # | 实现位置(函数/守卫/组件) | 错误情形 |
| ---- | ---- | ---- |
| 1 | `(app)/layout.tsx` AppLayout 守卫 + `calendar/page.tsx` `getCurrentSession` 空 → `redirect(ROUTES.login)`(均既有,零改动) | — |
| 2 | `calendar/page.tsx` searchParams 解析:无 `view` → 周;`?week=` 经 `isValidWeekStart` 采纳,非法/缺省回退今天所在周;`?view=month` 走既有 `parseMonthParam` 分支 | 非法参数静默回退,不报错 |
| 3 | `calendar/page.tsx` 渲染 ViewToggle Links(周 → `/calendar?week=<锚点>`;月 → `/calendar?view=month&month=<当前月>&week=<锚点>`),周视图才渲染周导航 | — |

### i18n 新增键(`src/locales`,`calendar.week.*` 命名空间)

`viewWeek` / `viewMonth` / `prevWeek` / `nextWeek` / `today` / `allDay` / `emptyWeek`(值逐字 = E-04「这周还没有安排」)/ `loadFailed`(值逐字 = E-05「加载失败,请重试」)/ `retry` / `nowLine`(aria-label)/ `createAt`(槽位 aria-label,含星期与钟点插值);星期列头复用既有 `calendar` 星期键(MonthGrid 在用)。文案键为唯一 E 文案载体,i18n 缓存键含语言维度(ADR-0010 既有机制)。

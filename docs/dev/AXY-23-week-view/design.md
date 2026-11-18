---
title: 'Design: AXY-23 日程周视图'
description: 日程周视图的架构设计(总览/非目标/UI/错误边界/需求承载;数据与契约、测试接缝、ADR 关系拆出)
sidebar_position: 2
---

# Design: AXY-23 日程周视图

| 对应 Proposal | [AXY-23](/product/AXY-23-week-view/proposal) | 状态 | 已批准 |
| ---- | ---- | ---- | ---- |
| 日期 | 2026-11-19 | 批准人 | 海渝(2026-11-19) |

> 本文件为 design 主文件,**唯一批准状态真源**;拆出文件([contracts](/dev/AXY-23-week-view/contracts) / [testing](/dev/AXY-23-week-view/testing) / [adr](/dev/AXY-23-week-view/adr))头部不另设状态列。

## 架构总览

周视图是 calendar 模块的**呈现层增量**:零数据模型改动、零新接口——读复用 `queries`(新增 `listWeekEntries`,同表同 userId 过滤),写完全复用 AXY-22 既有三个 Server Actions。视图与翻周沿用 AXY-22 已确立的 RSC + searchParams 服务端导航模式(`/calendar` 单页,`?view= / ?week= / ?month=` 承载视图态),客户端只持有编辑卡开关与实时线两类纯 UI 本地态。新增 `week.ts` 承载周数学与网格布局纯函数(与 `month.ts` 同风格:零 IO、零日期库、字面日期语义),是本特性单测的主战场。实现路径:week.ts(TDD 红)→ queries → page 组装 → WeekView 组件族 → i18n 与 E2E。

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置(不覆盖/不引入的概念) |
| ---- | ---- | ---- |
| 1 | 拖拽移动色块、拖边调整时长 | 不引入拖拽交互;色块无拖拽事件,创建/编辑仅经点击槽/块打开编辑卡(D-04) |
| 2 | 地点、标签/分类、每条目独立颜色 | 不引入新字段、颜色不入编辑卡;色块用现有品牌语义 token 单色(D-03 / D-11),`calendar_entry` 表不动 |
| 3 | 修改条目数据模型(新属性/新状态/新接口) | 零迁移、零新端点;读写复用既有 actions 与 `calendarEntryInputSchema` |
| 4 | 跨午夜时间段 | 不放宽 F-03 校验:zod 契约原样复用,网格几何不出现跨日块 |
| 5 | 移动端专属周视图形态 | 不做单日纵列降级组件;仅横向滚动容器(D-09) |

## UI 与组件

1. **路由/页面**:`/calendar` 单页不变;searchParams 承载视图态——无 `view` 参数(或缺省)= 周视图今天所在周(D-02 / 路由行为 #2),`?week=YYYY-MM-DD`(须为周一,`isValidWeekStart` 校验)= 指定周,`?view=month&month=YYYY-MM&week=<锚点>` = 月视图(锚点随行,供切回周视图保持所在周,路由行为 #3);非法参数一律回退对应默认值,不报错(与 AXY-22 `parseMonthParam` 同款)。周/月切换与翻周均为服务端 `<Link>`(与既有月导航先例一致),URL 全程停留在 `/calendar` 路径。

2. **组件树与既有组件复用关系**:

   ```
   page.tsx (RSC, 既有改造): 守卫 → 解析参数 → listWeekEntries|listMonthEntries
   ├─ StarsBackground (既有, 不动)
   ├─ 页头: 标题 + ViewToggle(服务端 Links 分段控件, 新) + 周导航 prev/today/next(新; 月导航既有)
   ├─ WeekView (Client, 新): 本地态 = 编辑卡开关(dialogState)
   │  ├─ 星期表头(7 列, 今日列高亮)
   │  ├─ AllDayRow(新): 各列全天区条目, 点击 → 编辑卡
   │  ├─ TimeGrid(新): 横向滚动容器(窄屏 D-09)+ 时间纵轴 sticky 列 + 7 列 × 48 槽
   │  │  └─ 色块(绝对定位, layoutDayBlocks 产出; 点击 → 编辑卡)
   │  ├─ NowLine(新): 实时线, setInterval 每分钟更新(F-06)
   │  └─ WeekEntryDialog(新): shadcn Dialog(新装, 见 adr.md)
   │     ├─ EntryForm(既有复用, 新增可选 prop showDateField=false: 周视图编辑卡只显文字+时间, 日期锁定所在列)
   │     └─ AlertDialog(既有): 删除二次确认(AXY-22 D-08 同款)
   └─ CalendarScreen (Client, 既有, 不动): 月视图整分支原样保留
   ```

   状态归属:`dialogState`、实时线分钟数、初始滚动为 WeekView/子组件本地 useState/useEffect;视图态与所在周在 URL(不入 zustand,ADR-0009);服务端数据经 props 下行(ADR-0025 基线流,与月视图一致,无 TanStack Query)。

3. **表单与交互状态**:编辑卡字段即 AXY-22 既有字段——事项文本(AXY-22 F-01,`maxLength=50` 前端半边 + zod `max(50)` 后端半边,均在 `calendarEntryInputSchema`/EntryForm 既有落点)、开始/结束时间(AXY-22 F-02/F-03,结束控件开始留空禁用既有);本特性新增:F-05 的预填半边落 `slotPrefillStart`(week.ts,点击分钟 → 槽起点),槽可点性落 TimeGrid 槽位 button(`aria-label` 含星期与钟点);F-06 落 NowLine(客户端本地时钟,60s interval)。错误呈现:E-01 / AXY-22 E-03 在编辑卡对应字段下方(EntryForm 既有),AXY-22 E-02 在卡内表单提示区(既有),E-04 在周视图网格空态区(WeekView,文案逐字「这周还没有安排」),E-05 在 `/calendar` 路由错误边界(error.tsx 新增,文案逐字「加载失败,请重试」+ 重试按钮);提交中按钮置灰(`isPending`,EntryForm 既有)。

4. **演示态 ↔ AC 映射**(与 proposal 14.1 一一对应):

   | 演示态 | 内容 | AC |
   | ---- | ---- | ---- |
   | 1 | 周视图总览:色块、实时线、翻周、窄屏横滚 | AC-1、AC-2 |
   | 2 | 网格点击创建(槽预填) | AC-4 |
   | 3 | 点色块编辑与删除 | AC-3 |
   | 4 | 全天区(不带时间条目) | AC-5 |
   | 5 | 空周与视图切换一致 | AC-6 |

5. **守卫归属**:零新增守卫——未登录拦截延续 `(app)/layout.tsx` 的 `AppLayout`(服务端 redirect),page.tsx 内 `getCurrentSession` 空值再 `redirect(ROUTES.login)`(既有纵深防御,不动);周视图不引入任何客户端守卫分支。

## 错误与边界处理

**表一 · proposal 边界表对应**

| proposal 边界项 | 处理方式 | 落点(组件/函数) |
| ---- | ---- | ---- |
| 1 | 字段合法域与校验文案完全继承 AXY-22 F-01—F-04 / E-01 / E-03,zod 契约原样复用,不新增不放宽 | `calendarEntryInputSchema`(既有)+ EntryForm(既有) |
| 2 | 重叠时间段并存无提示;重叠色块同列横向并列均分列宽 | `layoutDayBlocks`(week.ts,纯函数)→ TimeGrid 渲染 |
| 3 | 时间点条目渲染 30 分钟高短色块(D-12);不带时间条目只在全天区、永不落时间网格 | `layoutDayBlocks`(durationMinutes=30)+ AllDayRow 与 TimeGrid 的分组过滤 |
| 4 | 翻周不限方向与距离;实时线仅今天所在周呈现 | page.tsx 周导航 Links + NowLine 以 `days` 中是否存在 `isToday` 决定渲染 |
| 5 | 会话守卫与账号隔离复用 AXY-8/AXY-22 底座;周视图查询恒带 userId | page.tsx 守卫(既有)+ `listWeekEntries`(userId 过滤) |
| 6 | 周视图与月视图同一条目数据源:任一视图变更即时反映另一视图 | 写路径经既有 actions → `revalidatePath(ROUTES.calendar)`,两视图同页 RSC 重取 |
| 7 | 窄屏横滚时全天区与星期表头随内容横向同步、时间纵轴 sticky 不错位 | TimeGrid 单一滚动容器包裹表头/全天区/网格,纵轴列 `sticky left-0` |

**表二 · E 表映射**

| E 编号 | 产出函数/组件 | 呈现位置 | 关联 R |
| ---- | ---- | ---- | ---- |
| E-01(AXY-22) | EntryForm(既有,zod fieldErrors) | 编辑卡事项文本字段下方 | R3、R4 |
| E-02(AXY-22) | EntryForm(既有) | 编辑卡表单提示区 | R3、R4 |
| E-03(AXY-22) | EntryForm(既有,zod fieldErrors) | 编辑卡结束时间字段下方 | R3、R4 |
| E-04(本特性) | WeekView 空态分支 | 周视图网格区域(整周无条目时) | R6 |
| E-05(本特性) | `(app)/calendar/error.tsx`(新) | 页面级错误边界,附「重试」(reset) | R9 |

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | ---- |
| R1 | page.tsx 缺省参数 → 今天所在周 + `listWeekEntries` + WeekView 渲染色块(D-12 短色块、D-10 初始滚动) | E2E:登录直达 `/calendar` 断言今天所在周列头与既有条目色块位置;单元:`weekStartFor` / `buildWeekDays` |
| R2 | NowLine(F-06 客户端本地钟,60s interval;仅 `days` 含 today 渲染) | 单元:`timeToMinutes` 换算与 NowLine 可见性判定函数;E2E:今天所在周实时线存在、翻走后消失 |
| R3 | WeekEntryDialog(edit 模式)+ EntryForm(showDateField=false)+ AlertDialog 二次确认 + 既有 update/delete actions | E2E:点色块 → 卡内预填原值 → 改后色块更新;删除经确认后消失、取消保留;单元:fieldErrors 映射(既有 schema 测试延伸) |
| R4 | TimeGrid 槽位点击 → create 模式 WeekEntryDialog,`slotPrefillStart` 预填(F-05),保存经既有 createEntryAction | 单元:`slotPrefillStart`(14:20→14:00、14:30→14:30);E2E:点周三 14:30 槽 → 卡内开始时间 14:30 → 保存后色块出现 |
| R5 | AllDayRow 渲染无时间条目(D-06);点击打开 edit 模式卡(时间字段空,可补填) | E2E:仅无时间条目的列 → 全天区展示、时间网格无对应色块、点击可编辑 |
| R6 | WeekView 空态分支(E-04)+ 服务端 Link 切换,两视图共用数据源与 revalidate | E2E:空周文案逐字;月视图创建 → 切周可见;URL 全程 `/calendar` 路径 |
| R7 | `listWeekEntries` 恒带 userId;不新增表/端点/独立接口 | 集成:账号乙会话不可取账号甲周条目;代码审查:接口层无新增日历端点 |
| R8 | TimeGrid 横向滚动容器 + 列最小宽度,全天区与表头同容器滚动(D-09) | E2E(窄视口 375px):7 列可横滚、全天区与表头可见、文字可读 |
| R9 | `(app)/calendar/error.tsx` 错误边界:E-05 逐字 + reset 重试 | 组件测试:渲染 E-05 文案、点击重试触发 reset(E2E 不注入 DB 故障,见开放问题 #2) |
| R10 | ViewToggle 服务端 Links:周 → `?week=<锚点>`、月 → `?view=month&month=<当前月>&week=<锚点>`(路由行为 #3) | E2E:切换后视图与 URL 参数断言、切回周保持所在周 |
| R11 | 周导航 prev/today/next Links(`addWeeks` ±1、`weekStartFor(today)`) | 单元:`addWeeks` 跨月跨年;E2E:翻下周实时线隐藏、「今天」返回恢复 |

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---- | ---- |
| 1 | 视图态承载方式:proposal 开放问题 #1 倾向「组件内状态」,本设计按 searchParams URL 承载(翻周需服务端取数,且与 AXY-22 月导航 `?month=` 先例同构) | 不阻塞契约与测试设计——接缝已按 URL 模式落定 | 回流 proposal 追认:闭合 proposal 开放问题 #1 为「入 URL(searchParams)」 |
| 2 | R9(E-05 加载失败)在 E2E 中无法便捷注入 DB 故障(RSC 数据流无前端请求可拦截) | 不阻塞设计;仅影响 R9 的测试归属 | 声明假设:E-05 归组件测试承载,E2E 覆盖正常加载路径;已同步登记 testing.md |

## 拆出文件索引

| 拆出文件 | 内容 | 模板与合格判据 |
| ---- | ---- | ---- |
| [contracts.md](/dev/AXY-23-week-view/contracts) | 数据模型(零迁移声明)与契约(week.ts / queries / 组件,含路由行为落点表) | templates/contracts.md |
| [testing.md](/dev/AXY-23-week-view/testing) | 测试接缝(TDD red 阶段直接输入) | templates/testing.md |
| [adr.md](/dev/AXY-23-week-view/adr) | 与 ADR 的关系(一页纸)+ Q 条目去向 | templates/adr.md |

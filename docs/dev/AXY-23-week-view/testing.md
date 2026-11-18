---
title: 'Design: AXY-23 日程周视图 · 测试接缝'
description: 日程周视图的测试接缝(TDD red 阶段的直接输入)
sidebar_position: 4
---

# Design: AXY-23 日程周视图 · 测试接缝

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 测试接缝

| 测试层(单元/集成/E2E/人工抽检) | 接缝(函数/路由/接口) | 断言要点 | 关联 R |
| ---- | ---- | ---- | ---- |
| 单元 | `tests/calendar/week.test.ts` → `weekStartFor` | 周中日期 → 所在周周一;周一输入恒等;跨月/跨年边界(如 2026-12-28 → 2026-12-28 周) | R1 |
| 单元 | 同上 → `buildWeekDays` | 恰 7 项、列序周一首(mon..sun)、`isToday` 仅命中今天 | R1 |
| 单元 | 同上 → `weekRange` / `addWeeks` | 周区间周一..周日;±1 周跨月跨年正确;`addWeeks(weekStart, 0)` 恒等 | R11 |
| 单元 | 同上 → `isValidWeekStart` | 拒非周一(如周四)、拒非法格式(2026-02-30、2026-13-01);收合法周一 | R1(路由行为 #2) |
| 单元 | 同上 → `slotPrefillStart` | 14:20→"14:00"、14:30→"14:30"、07:00→"07:00"(整点恒等)、23:59→"23:30"(F-05 向下取整) | R4 |
| 单元 | 同上 → `timeToMinutes` / `layoutDayBlocks` | 时间点条目 durationMinutes=30(D-12);无重叠块满列宽;两/三重叠簇并列均分(leftPercent/widthPercent 合计 100,proposal 边界 #2);入参顺序无关 | R1、R3(边界 #2/#3) |
| 单元(组件) | `tests/calendar/components/WeekView.test.tsx` → WeekView | 整周无条目 → E-04 文案逐字「这周还没有安排」;有全天条目 → AllDayRow 展示且时间网格无对应色块 | R5、R6 |
| 单元(组件) | `tests/calendar/components/WeekView.test.tsx` → NowLine 可见性 | days 含 isToday → 实时线渲染;不含 → 不渲染(直接断言可见性判定,不 fake timer 定位) | R2 |
| 单元(组件) | `tests/calendar/components/ErrorBoundary`(`app/(app)/calendar/error.tsx`) | 渲染 E-05 文案逐字「加载失败,请重试」;点击重试调用 `reset()` | R9 |
| 集成 | `tests/integration/calendar/queries.test.ts` → `listWeekEntries` | 周区间过滤正确(仅本周、跨月周);账号乙会话/数据不可取账号甲条目(R7);空周返回空数组;排序与 listMonthEntries 口径一致 | R6、R7 |
| 集成 | `tests/integration/calendar/actions.test.ts`(既有,回归) | 既有三 action 用例全绿——周视图复用未破坏写路径 | R3、R4 |
| E2E | `e2e/calendar-week.spec.ts` 演示态 1(`/?`直达 `/calendar`) | 默认展示今天所在周(列头与今天列高亮);既有带时间条目渲染为色块且文字可读;实时线存在;翻上一周 → 实时线消失;「今天」→ 恢复;375px 视口横向滚动且全天区/表头可见 | R1、R2、R8、R11 |
| E2E | 同上 演示态 2 | 点击周三 14:30 空槽 → 编辑卡开始时间预填 "14:30";仅填文字保存 → 色块即时出现于该列对应高度 | R4 |
| E2E | 同上 演示态 3 | 点击 14:00–15:30 色块 → 卡内预填原值;改文字/时间保存 → 色块更新;删除经二次确认后消失、取消保留 | R3 |
| E2E | 同上 演示态 4 | 无时间条目仅出现在该列全天区,时间网格无色块;点击全天区条目可编辑 | R5 |
| E2E | 同上 演示态 5 | 空周 → E-04 逐字;切「月」→ 月视图当前月(AXY-22 形态);切回「周」→ 保持所在周;全程 URL 路径为 `/calendar`;月视图创建的条目切周可见 | R6、R10 |
| 人工抽检 | 开发环境人工走查演示态 1–5 各一遍 | 明暗两色下色块/实时线/空态可读;暗色模式与 calendar-theme 既有视觉一致 | R1—R6 |

> E2E 前置:沿用 `e2e/helpers` 既有登录助手;条目种子经 UI 或既有 action 建立,不直插 DB(与 calendar.spec.ts 同款做法)。

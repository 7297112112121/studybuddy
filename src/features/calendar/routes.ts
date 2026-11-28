/**
 * 日历域路由词汇：URL 周参数解析回退与周导航链接派生（纯函数，无 React）。
 * 跳转动作由组合层承接，本模块只产出链接与锚点。
 */
import type { Route } from "next";

import { isValidWeekStart } from "@/validation/calendar";
import { addWeeks, weekStartFor } from "./utils";

/** searchParams → 周定位：缺省/非法一律静默回退今天所在周，不报错。 */
export function parseWeekParam(
  params: CalendarPageParams,
  today: string,
): string {
  return params.week !== undefined && isValidWeekStart(params.week)
    ? params.week
    : weekStartFor(today);
}

/** 周导航链接：当前周的前/后落点与今天落点（周一锚）。 */
export function weekNavLinks(
  weekStart: string,
  today: string,
): CalendarNavLinks {
  return {
    prevHref: `/calendar?week=${addWeeks(weekStart, -1)}` as Route,
    todayHref: `/calendar?week=${weekStartFor(today)}` as Route,
    nextHref: `/calendar?week=${addWeeks(weekStart, 1)}` as Route,
  };
}

/** 点日期格 → 该日所在周链接（周一锚），周视图与迷你月历高亮随之联动。 */
export function weekHref(date: string): Route {
  return `/calendar?week=${weekStartFor(date)}` as Route;
}

/** searchParams wire 形状（与 /calendar?week= 一致）。 */
export type CalendarPageParams = { week?: string };

/** 周导航链接：当前周的前/后落点（含今天）。 */
export type CalendarNavLinks = {
  prevHref: Route;
  todayHref: Route;
  nextHref: Route;
};

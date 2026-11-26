/**
 * 日历页屏状态机：今天定格、视图态解析回退、读域装载与导航链接派生——
 * 页面组合层（CalendarPageClient）的唯一状态来源。
 */
import { useEffect, useMemo, useState } from "react";

import {
  formatYearMonth,
  isValidWeekStart,
  parseYearMonth,
} from "@/validation/calendar-validators";
import { useCalendarStore } from "@/stores/calendar";

import { addMonths, addWeeks, weekStartFor } from "./dates";

/** searchParams wire 形状（与 /calendar?view=&week=&month= 一致）。 */
export type CalendarPageParams = {
  view?: string;
  week?: string;
  month?: string;
};

/** 视图态解析结果：周（周一锚点）或月（年月），即日历 store 读域。 */
export type CalendarViewParams =
  | { view: "week"; weekStart: string }
  | { view: "month"; year: number; month: number };

/** 导航链接派生结果：分段控件两臂 + 当前视图的前/后落点（周含今天）。 */
export type CalendarNavLinks = {
  weekTabHref: string;
  monthTabHref: string;
  week?: { prevHref: string; todayHref: string; nextHref: string };
  month?: { prevHref: string; nextHref: string; year: number; month: number };
};

/** 数字 → "M"/"MM" 零填充。 */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 本地今天（"YYYY-MM-DD"）：mount 期定格一次，避免逐渲染漂移。 */
function useToday(): string {
  const [today] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  });
  return today;
}

/** searchParams → 视图态：缺省/非法一律静默回退（周：今天所在周；月：当前月），不报错。 */
function parseViewParams(
  params: CalendarPageParams,
  today: string,
): CalendarViewParams {
  if (params.view === "month") {
    const shown = parseYearMonth(params.month) ?? {
      year: Number(today.slice(0, 4)),
      month: Number(today.slice(5, 7)),
    };
    return { view: "month", year: shown.year, month: shown.month };
  }
  const weekStart =
    params.week !== undefined && isValidWeekStart(params.week)
      ? params.week
      : weekStartFor(today);
  return { view: "week", weekStart };
}

export function useCalendarScreen(params: CalendarPageParams) {
  const today = useToday();
  const load = useCalendarStore((s) => s.load);
  const entries = useCalendarStore((s) => s.entries);
  // params 由薄壳 page 传入：同一次导航内引用稳定，store 更新引发的重渲染
  // 不会重建；跨导航由 page 侧新 searchParams 触发重建。
  const shown = useMemo(() => parseViewParams(params, today), [params, today]);

  // 数据经 store 读域加载
  useEffect(() => {
    void load(shown);
  }, [load, shown]);

  const currentWeekStart = weekStartFor(today);
  const carriedWeek =
    params.week !== undefined && isValidWeekStart(params.week)
      ? params.week
      : currentWeekStart;
  const nav: CalendarNavLinks = {
    weekTabHref: `/calendar?week=${carriedWeek}`,
    monthTabHref: `/calendar?view=month&month=${formatYearMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)))}&week=${carriedWeek}`,
  };
  if (shown.view === "week") {
    nav.week = {
      prevHref: `/calendar?week=${addWeeks(shown.weekStart, -1)}`,
      todayHref: `/calendar?week=${currentWeekStart}`,
      nextHref: `/calendar?week=${addWeeks(shown.weekStart, 1)}`,
    };
  } else {
    const prev = addMonths(shown.year, shown.month, -1);
    const next = addMonths(shown.year, shown.month, 1);
    nav.month = {
      prevHref: `/calendar?view=month&month=${formatYearMonth(prev.year, prev.month)}&week=${carriedWeek}`,
      nextHref: `/calendar?view=month&month=${formatYearMonth(next.year, next.month)}&week=${carriedWeek}`,
      year: shown.year,
      month: shown.month,
    };
  }

  return { shown, today, entries, nav };
}

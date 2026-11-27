/**
 * 日历页屏状态机：今天定格、周定位解析回退、双读域装载（导航域 + 今日域）、
 * 周导航链接派生、迷你月历接线与编辑卡开合——页面组合层（CalendarPageClient）
 * 的唯一状态来源。
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isValidWeekStart } from "@/validation/calendar-validators";
import { useCalendarStore } from "@/stores/calendar";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { addWeeks, slotPrefillStart, weekStartFor } from "./dates";

/** searchParams wire 形状（与 /calendar?week= 一致）。 */
export type CalendarPageParams = { week?: string };

/** 周导航链接：当前周的前/后落点（含今天）。 */
export type CalendarNavLinks = {
  prevHref: string;
  todayHref: string;
  nextHref: string;
};

/** 周编辑卡开合态：create 模式带所在列日期与槽起点预填，edit 模式带原条目。 */
export type WeekEntryDialogState =
  | { mode: "create"; date: string; prefillStart: string }
  | { mode: "edit"; entry: CalendarEntryView };

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

/** searchParams → 周定位：缺省/非法一律静默回退今天所在周，不报错。 */
function parseWeekParams(params: CalendarPageParams, today: string): string {
  return params.week !== undefined && isValidWeekStart(params.week)
    ? params.week
    : weekStartFor(today);
}

export function useCalendarScreen(params: CalendarPageParams) {
  const router = useRouter();
  const today = useToday();
  const load = useCalendarStore((s) => s.load);
  const loadToday = useCalendarStore((s) => s.loadToday);
  const entries = useCalendarStore((s) => s.entries);
  const todayEntries = useCalendarStore((s) => s.todayEntries);
  // params 由薄壳 page 传入：同一次导航内引用稳定；跨导航由 page 侧新
  // searchParams 触发重建。
  const weekStart = parseWeekParams(params, today);

  // 数据经 store 双读域装载：导航域随定位变化，今日域锚定今天所在周
  useEffect(() => {
    void load({ view: "week", weekStart });
  }, [load, weekStart]);
  useEffect(() => {
    void loadToday(weekStartFor(today));
  }, [loadToday, today]);

  // 迷你月历点日 → 跳该日所在周（周一锚），周视图与迷你月历高亮随之联动
  const selectDate = (date: string) => {
    router.push(`/calendar?week=${weekStartFor(date)}`);
  };

  const nav: CalendarNavLinks = {
    prevHref: `/calendar?week=${addWeeks(weekStart, -1)}`,
    todayHref: `/calendar?week=${weekStartFor(today)}`,
    nextHref: `/calendar?week=${addWeeks(weekStart, 1)}`,
  };

  const [dialogState, setDialogState] = useState<WeekEntryDialogState | null>(
    null,
  );

  const todaysSchedule = todayEntries.filter((entry) => entry.date === today);

  return {
    weekStart,
    today,
    entries,
    todayEntries,
    /** 今天当天的条目（自今日读域过滤）；todayEntries 是今天所在周的读域，两词异义。 */
    todaysSchedule,
    nav,
    selectDate,
    dialogState,
    openCreate: (date: string, slotMinutes: number) => {
      setDialogState({
        mode: "create",
        date,
        prefillStart: slotPrefillStart(slotMinutes),
      });
    },
    openEdit: (entry: CalendarEntryView) => {
      setDialogState({ mode: "edit", entry });
    },
    closeDialog: () => setDialogState(null),
  };
}

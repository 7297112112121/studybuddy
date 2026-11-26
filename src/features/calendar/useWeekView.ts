/**
 * 周视图屏状态机：实时线时钟、纵向滚动锚定与按日分组派生——
 * 周视图组合层（WeekView）的唯一状态来源。编辑卡开合在页面级
 * 屏状态机（useCalendarScreen），周网格与今日日程共用同一开合态。
 */
import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { PX_PER_MINUTE, groupEntriesByDate, type WeekDay } from "./dates";

/** 非今天所在周的滚动锚点（08:00）。 */
const NON_TODAY_ANCHOR_MINUTES = 8 * 60;
/** 打开即锚定当前时段前两小时，免切换即可见实时线。 */
const ANCHOR_LOOKBACK_MINUTES = 120;

/** 客户端本地时钟 → 当日分钟数。 */
function clientNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useWeekView(days: WeekDay[], entries: CalendarEntryView[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number>(clientNowMinutes);
  const hasToday = days.some((day) => day.isToday);

  // 实时线随客户端本地时钟每分钟更新一次位置
  useEffect(() => {
    const timer = setInterval(() => setNowMinutes(clientNowMinutes()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 打开即锚定当前时段；非今天所在周锚 08:00
  const anchorRef = useRef<number | null>(null);
  if (anchorRef.current === null) {
    anchorRef.current =
      (hasToday ? clientNowMinutes() : NON_TODAY_ANCHOR_MINUTES) -
      ANCHOR_LOOKBACK_MINUTES;
  }
  useEffect(() => {
    const element = scrollRef.current;
    if (element && anchorRef.current !== null) {
      element.scrollTop = Math.max(0, anchorRef.current * PX_PER_MINUTE);
    }
  }, []);

  const byDate = useMemo(() => groupEntriesByDate(entries), [entries]);

  return { scrollRef, nowMinutes, hasToday, byDate };
}

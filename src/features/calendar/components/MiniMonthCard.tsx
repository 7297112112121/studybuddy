"use client";

/**
 * 迷你月历卡组合层：翻月显示月（薄瞬态 useState）内联本层，接线迷你月历
 * 与翻月/跳周回调。显示月重置语义由父级 key 承担——key 绑 URL 周所在月，
 * 跨月翻周/点日跳周即重挂载回落，同月内手动翻月态保留。
 */
import { useState } from "react";

import { monthOf, addMonths, type WeekDay } from "../utils";
import MiniMonth from "./MiniMonth";

type MiniMonthCardProps = {
  weekStart: string;
  today: string;
  /** URL 所示周恰 7 个日期（YYYY-MM-DD），整周高亮与周视图联动。 */
  weekDates: WeekDay["date"][];
  /** 点日期格 → 跳该日所在周（页面级导航）。 */
  onSelect: (date: string) => void;
};

export default function MiniMonthCard({
  weekStart,
  today,
  weekDates,
  onSelect,
}: MiniMonthCardProps) {
  const [shown, setShown] = useState(() => monthOf(weekStart));

  return (
    <MiniMonth
      year={shown.year}
      month={shown.month}
      today={today}
      weekDates={weekDates}
      onPrevMonth={() => setShown((m) => addMonths(m.year, m.month, -1))}
      onNextMonth={() => setShown((m) => addMonths(m.year, m.month, 1))}
      onSelect={onSelect}
    />
  );
}

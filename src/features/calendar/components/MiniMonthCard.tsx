"use client";

/**
 * 迷你月历卡组合层：接月历屏状态机（useMiniMonth），接线迷你月历与翻月/
 * 跳周回调；自身零状态。显示月重置语义由父级 key 承担——key 绑 URL 周
 * 所在月，跨月翻周/点日跳周即重挂载回落，同月内手动翻月态保留。
 */
import type { WeekDay } from "../dates";
import { useMiniMonth } from "../useMiniMonth";
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
  const { shown, onPrev, onNext } = useMiniMonth(weekStart);

  return (
    <MiniMonth
      year={shown.year}
      month={shown.month}
      today={today}
      weekDates={weekDates}
      onPrevMonth={onPrev}
      onNextMonth={onNext}
      onSelect={onSelect}
    />
  );
}

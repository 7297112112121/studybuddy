"use client";

/**
 * 迷你月历（纯展示）：右栏周导航副件——今日章常亮、URL 所示周整周高亮、
 * 翻月与点日跳周全由 props 回调承接；不带条目摘要（侧栏宽度内容适配裁决，
 * 条目看周网格与今日日程）。显示月由页面级 useMiniMonth 持有。
 */
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cn } from "cn";

import { buildMonthGrid } from "../dates";

type MiniMonthProps = {
  year: number;
  month: number;
  today: string;
  /** URL 所示周恰 7 个日期（YYYY-MM-DD），整周高亮与周视图联动。 */
  weekDates: string[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** 点日期格 → 跳该日所在周。 */
  onSelect: (date: string) => void;
};

/** 星期表头键序 = buildMonthGrid 的周一首日列序。 */
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default function MiniMonth({
  year,
  month,
  today,
  weekDates,
  onPrevMonth,
  onNextMonth,
  onSelect,
}: MiniMonthProps) {
  const t = useTranslations("calendar");
  const cells = buildMonthGrid(year, month, today);
  const weekSet = new Set(weekDates);

  return (
    <section
      className="flex flex-col gap-2 rounded-2xl border border-white/25 bg-aurora-ink/40 p-4"
      data-testid="mini-month"
    >
      <header className="flex items-center justify-between">
        {/* 月份数字沿用月导航的 tabular-nums 排版词汇，尺寸随侧栏收缩 */}
        <span className="text-sm font-semibold tabular-nums">
          {t("page.monthLabel", { year, month })}
        </span>
        <nav className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onPrevMonth}
            aria-label={t("page.prevMonth")}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onNextMonth}
            aria-label={t("page.nextMonth")}
          >
            <ChevronRight />
          </Button>
        </nav>
      </header>
      <div className="grid grid-cols-7 justify-items-center">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            data-weekday
            className="grid size-8 place-items-center text-xs text-muted-foreground"
          >
            {t(`weekday.${key}`)}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 justify-items-center"
        role="grid"
        aria-label={`${year}-${month}`}
      >
        {cells.map((cell) => {
          const inWeek = weekSet.has(cell.date);
          return (
            <button
              key={cell.date}
              type="button"
              data-cell
              data-date={cell.date}
              data-today={cell.isToday}
              data-in-week={inWeek}
              onClick={() => onSelect(cell.date)}
              className={cn(
                "grid size-8 place-items-center rounded-full text-xs tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                cell.inMonth ? "text-foreground" : "text-muted-foreground/60",
                !cell.isToday && "hover:bg-accent",
                inWeek && !cell.isToday && "bg-accent",
                cell.isToday &&
                  "bg-primary font-semibold text-primary-foreground",
              )}
            >
              {Number(cell.date.slice(8))}
            </button>
          );
        })}
      </div>
    </section>
  );
}

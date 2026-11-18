"use client";

/**
 * 月视图网格（AXY-22 design「UI 与组件」节；视觉重做——台历式日期章）。
 *
 * 星期表头（周一为首，与 buildMonthGrid 对齐）+ 消费 buildMonthGrid 渲染
 * 6×7 网格。今日格以「日期章」常亮（仅数字反白 bg-primary，格子底色不
 * 反转）；选中格 bg-accent + ring-primary 内环，与今日章可区分（语义
 * token，ADR-0003）；条目渲染为格内灰摘要条（带时间「HH:MM title」、
 * 不带「title」），最多 2 条，超出以「+N」计数（E2E 断言详情面板而非
 * 月格截断）；点击日期格 → onSelect。
 */
import { useTranslations } from "next-intl";

import { cn } from "cn";

import { buildMonthGrid } from "../month";
import type { CalendarEntryView } from "../queries";

type MonthGridProps = {
  year: number;
  month: number;
  today: string;
  entries: CalendarEntryView[];
  selectedDate: string;
  onSelect: (date: string) => void;
};

const MAX_SUMMARY = 2;

/** 星期表头键序 = buildMonthGrid 的周一首日列序。 */
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default function MonthGrid({
  year,
  month,
  today,
  entries,
  selectedDate,
  onSelect,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const cells = buildMonthGrid(year, month, today);

  const byDate = new Map<string, CalendarEntryView[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) {
      list.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            data-weekday
            className="pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {t(`weekday.${key}`)}
          </div>
        ))}
      </div>
      <div
        className="grid w-full grid-cols-7 gap-1"
        role="grid"
        aria-label={`${year}-${month}`}
      >
        {cells.map((cell) => {
          const cellEntries = byDate.get(cell.date) ?? [];
          const shown = cellEntries.slice(0, MAX_SUMMARY);
          const extra = cellEntries.length - shown.length;
          const selected = cell.date === selectedDate;
          return (
            <button
              key={cell.date}
              type="button"
              data-cell
              data-date={cell.date}
              data-today={cell.isToday}
              data-selected={selected}
              onClick={() => onSelect(cell.date)}
              className={cn(
                "flex min-h-16 flex-col items-stretch gap-1 rounded-lg px-1 py-1.5 text-sm transition-colors md:min-h-20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                cell.inMonth ? "text-foreground" : "text-muted-foreground/60",
                !cell.isToday && !selected && "hover:bg-accent",
                selected && "bg-accent ring-2 ring-inset ring-primary",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center self-start rounded-md text-sm font-medium tabular-nums",
                  cell.isToday &&
                    "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {Number(cell.date.slice(8))}
              </span>
              {shown.map((entry) => (
                <span
                  key={entry.id}
                  className={cn(
                    "w-full truncate rounded-sm px-1 py-0.5 text-[11px] leading-tight",
                    cell.isToday ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  {entry.startTime === null
                    ? entry.title
                    : `${entry.startTime} ${entry.title}`}
                </span>
              ))}
              {extra > 0 && (
                <span className="px-1 text-left text-xs text-muted-foreground">
                  +{extra}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

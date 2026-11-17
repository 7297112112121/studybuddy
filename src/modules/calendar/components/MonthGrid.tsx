"use client";

/**
 * 月视图网格（AXY-22 design「UI 与组件」节）。
 *
 * 消费 buildMonthGrid 渲染 6×7 网格；今日格常亮（bg-primary）、选中格
 * 独立样式可区分（ring-primary，语义 token，ADR-0003）；每格渲染当天
 * 条目摘要行（带时间「HH:MM title」、不带「title」），最多 2 条，超出
 * 以「+N」计数（E2E 断言详情面板而非月格截断）；点击日期格 → onSelect。
 */
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

export default function MonthGrid({
  year,
  month,
  today,
  entries,
  selectedDate,
  onSelect,
}: MonthGridProps) {
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
              "flex min-h-14 flex-col items-center gap-0.5 rounded-md px-1 py-1 text-sm transition-colors",
              cell.inMonth ? "text-foreground" : "text-muted-foreground",
              cell.isToday
                ? "bg-primary font-semibold text-primary-foreground"
                : "hover:bg-accent",
              selected && "ring-2 ring-primary",
            )}
          >
            <span>{Number(cell.date.slice(8))}</span>
            {shown.map((entry) => (
              <span key={entry.id} className="w-full truncate text-xs">
                {entry.startTime === null
                  ? entry.title
                  : `${entry.startTime} ${entry.title}`}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-muted-foreground w-full text-left text-xs">
                +{extra}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

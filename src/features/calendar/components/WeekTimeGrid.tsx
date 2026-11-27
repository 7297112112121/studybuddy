"use client";

/**
 * 周视图时间网格（纯展示）：纵轴小时刻度（实时线到达整点时该标签高亮）、
 * 七列单日分派与实时线（仅今天所在周渲染）。
 */
import { useTranslations } from "next-intl";

import { cn } from "cn";

import type { CalendarEntryView } from "@/validation/calendar-response";

import {
  PX_PER_MINUTE,
  minutesToHhmm,
  type WeekDay,
} from "../utils";
import WeekDayColumn from "./WeekDayColumn";

type WeekTimeGridProps = {
  days: WeekDay[];
  byDate: Map<string, CalendarEntryView[]>;
  nowMinutes: number;
  hasToday: boolean;
  onCreate: (date: string, slotMinutes: number) => void;
  onEdit: (entry: CalendarEntryView) => void;
};

export default function WeekTimeGrid({
  days,
  byDate,
  nowMinutes,
  hasToday,
  onCreate,
  onEdit,
}: WeekTimeGridProps) {
  const t = useTranslations("calendar");
  const gridHeight = 24 * 60 * PX_PER_MINUTE;
  return (
    <div
      className="relative grid grid-cols-[3rem_repeat(7,1fr)]"
      style={{ height: gridHeight }}
    >
      <div className="relative">
        {Array.from({ length: 24 }, (_, hour) => {
          const isNowHour = hasToday && nowMinutes === hour * 60;
          return (
            <div
              key={hour}
              data-testid={`week-hour-${hour}`}
              className={cn(
                "absolute right-1 -translate-y-1/2 text-xs tabular-nums",
                isNowHour
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground",
              )}
              style={{ top: hour * 60 * PX_PER_MINUTE }}
            >
              {minutesToHhmm(hour * 60)}
            </div>
          );
        })}
      </div>
      {days.map((day) => (
        <WeekDayColumn
          key={day.date}
          day={day}
          entries={byDate.get(day.date) ?? []}
          onCreate={onCreate}
          onEdit={onEdit}
        />
      ))}
      {/* 实时线：容器自身即 1px 淡红底衬（h-px 保证非零包围盒），今天列段粗亮红叠于其上 */}
      {hasToday && (
        <div
          data-testid="now-line"
          aria-label={t("week.nowLine", { time: minutesToHhmm(nowMinutes) })}
          className="pointer-events-none absolute right-0 z-20 h-px bg-destructive/40"
          style={{ left: "3rem", top: nowMinutes * PX_PER_MINUTE }}
        >
          {/* 左端时间轴内的当前实时时间；整点时由高亮刻度承担，不重复显示 */}
          {nowMinutes % 60 !== 0 && (
            <span
              data-testid="now-line-time"
              className="absolute right-full top-0 -translate-y-1/2 pr-1 text-[11px] font-semibold tabular-nums text-destructive"
            >
              {minutesToHhmm(nowMinutes)}
            </span>
          )}
          <div
            data-testid="now-line-today"
            className="absolute top-0 h-0.5 -translate-y-1/2 rounded-full bg-destructive"
            style={{
              left: `${(days.findIndex((day) => day.isToday) * 100) / 7}%`,
              width: `${100 / 7}%`,
            }}
          >
            <span
              data-testid="now-line-dot"
              className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive"
            />
          </div>
        </div>
      )}
    </div>
  );
}

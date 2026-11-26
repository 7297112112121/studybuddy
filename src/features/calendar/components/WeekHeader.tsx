"use client";

/** 周视图星期表头（纯展示）：星期名 + 日期数字两行堆叠，今天列 primary 胶囊。 */
import { useTranslations } from "next-intl";

import { cn } from "cn";

import type { WeekDay } from "../dates";

type WeekHeaderProps = {
  days: WeekDay[];
};

export default function WeekHeader({ days }: WeekHeaderProps) {
  const t = useTranslations("calendar");
  return (
    <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
      <div />
      {days.map((day) => (
        <div
          key={day.date}
          data-testid={`week-col-${day.date}`}
          aria-current={day.isToday ? "date" : undefined}
          className={cn(
            "flex flex-col items-center gap-0.5 pb-2",
            day.isToday ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span className="text-xs font-medium">
            {t(`weekday.${day.weekdayKey}`)}
          </span>
          <span
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums",
              day.isToday && "bg-primary text-primary-foreground",
            )}
          >
            {day.date.slice(8)}
          </span>
        </div>
      ))}
    </div>
  );
}

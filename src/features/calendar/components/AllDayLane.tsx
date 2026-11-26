"use client";

/** 周视图全天区（纯展示）：无时间条目胶囊行，点击进入编辑。 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import type { WeekDay } from "../dates";

type AllDayLaneProps = {
  days: WeekDay[];
  byDate: Map<string, CalendarEntryView[]>;
  onEdit: (entry: CalendarEntryView) => void;
};

export default function AllDayLane({ days, byDate, onEdit }: AllDayLaneProps) {
  const t = useTranslations("calendar");
  return (
    <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-y border-border">
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        {t("week.allDay")}
      </div>
      {days.map((day) => (
        <div key={day.date} className="flex flex-col gap-1 px-0.5 py-1">
          {(byDate.get(day.date) ?? [])
            .filter((entry) => entry.startTime === null)
            .map((entry) => (
              <button
                key={entry.id}
                type="button"
                data-testid={`all-day-${entry.id}`}
                onClick={() => onEdit(entry)}
                className="truncate rounded-full bg-accent px-2 py-0.5 text-left text-xs hover:bg-accent/70"
              >
                {entry.title}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

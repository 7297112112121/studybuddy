"use client";

/** 月视图组合层：接屏状态机（useMonthScreen），接线月网格与当日面板；自身零状态。 */
import type { CalendarEntryView } from "@/modules/calendar/queries";

import { useMonthScreen } from "../useMonthScreen";
import DayPanel from "./DayPanel";
import MonthGrid from "./MonthGrid";

type CalendarScreenProps = {
  year: number;
  month: number;
  today: string;
  entries: CalendarEntryView[];
};

export default function CalendarScreen({
  year,
  month,
  today,
  entries,
}: CalendarScreenProps) {
  const { selectedDate, setSelectedDate, dayEntries } = useMonthScreen({
    year,
    month,
    today,
    entries,
  });

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="lg:w-3/5">
        <section className="rounded-2xl border border-white/25 bg-aurora-ink/40 p-3 md:p-4">
          <MonthGrid
            year={year}
            month={month}
            today={today}
            entries={entries}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </section>
      </div>
      <div className="lg:w-2/5">
        <DayPanel date={selectedDate} entries={dayEntries} today={today} />
      </div>
    </div>
  );
}

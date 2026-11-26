/**
 * 月视图屏状态机：选中日——今日在该月则选今日，否则选该月 1 日（换月回落
 * 语义）；当日条目过滤派生。月视图组合层（CalendarScreen）的唯一状态来源。
 */
import { useState } from "react";

import type { CalendarEntryView } from "@/modules/calendar/queries";

export function useMonthScreen(params: {
  year: number;
  month: number;
  today: string;
  entries: CalendarEntryView[];
}) {
  const monthPrefix = `${params.year}-${String(params.month).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(
    params.today.startsWith(monthPrefix) ? params.today : `${monthPrefix}-01`,
  );
  const dayEntries = params.entries.filter(
    (entry) => entry.date === selectedDate,
  );

  return { selectedDate, setSelectedDate, dayEntries };
}

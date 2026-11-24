"use client";

/**
 * 日历页顶层组装（AXY-22 design「UI 与组件」节）。
 *
 * 持有 selectedDate（本地 useState，纯 UI 态，不入 zustand/服务端缓存，
 * ADR-0009）：换月时回落——今日在该月则选中今日，否则选中该月 1 日。
 * 组装 MonthGrid + DayPanel（当日条目按选中天过滤后下行）。
 */
import { useState } from "react";

import type { CalendarEntryView } from "@/modules/calendar/queries";
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
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(
    today.startsWith(monthPrefix) ? today : `${monthPrefix}-01`,
  );

  const dayEntries = entries.filter((e) => e.date === selectedDate);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* 月视图面板:半透明深色底透星空,1px 白 25% 细描边略高亮,
          轮廓完整圆角(DayPanel 同款,见其组件头注) */}
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

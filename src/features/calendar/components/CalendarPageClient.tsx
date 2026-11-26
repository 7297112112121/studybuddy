"use client";

/**
 * 日历页组合层：接屏状态机（useCalendarScreen），接线页标题、导航与
 * 周/月视图分派；自身零状态。
 */
import { useTranslations } from "next-intl";

import { buildWeekDays } from "../dates";
import {
  useCalendarScreen,
  type CalendarPageParams,
} from "../useCalendarScreen";
import CalendarNav from "./CalendarNav";
import CalendarScreen from "./CalendarScreen";
import WeekView from "./WeekView";

export default function CalendarPageClient({
  params,
}: {
  params: CalendarPageParams;
}) {
  const t = useTranslations("calendar");
  const { shown, today, entries, nav } = useCalendarScreen(params);

  return (
    <main className="relative isolate mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 text-foreground md:p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
      <CalendarNav view={shown.view} links={nav} />
      {shown.view === "week" ? (
        <WeekView
          days={buildWeekDays(shown.weekStart, today)}
          entries={entries}
        />
      ) : (
        <CalendarScreen
          year={shown.year}
          month={shown.month}
          today={today}
          entries={entries}
        />
      )}
    </main>
  );
}

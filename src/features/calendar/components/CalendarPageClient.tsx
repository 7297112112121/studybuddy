"use client";

/**
 * 日历页组合层：接屏状态机（useCalendarScreen），接线标题、周视图主区与
 * 右栏（迷你月历 + 今日日程 + 未安排时间）双栏布局、页面级编辑卡；自身零状态。
 * 断点依内容：周网格 min-w-720 + 侧栏 360 → xl 起双栏，以下纵向堆叠。
 */
import { useTranslations } from "next-intl";

import { buildWeekDays } from "../dates";
import {
  useCalendarScreen,
  type CalendarPageParams,
} from "../useCalendarScreen";
import MiniMonthCard from "./MiniMonthCard";
import TodayPanel from "./TodayPanel";
import UnscheduledPanel from "./UnscheduledPanel";
import WeekEntryDialog from "./WeekEntryDialog";
import WeekView from "./WeekView";

export default function CalendarPageClient({
  params,
}: {
  params: CalendarPageParams;
}) {
  const t = useTranslations("calendar");
  const {
    weekStart,
    today,
    entries,
    todaysSchedule,
    weekUnscheduled,
    nav,
    selectDate,
    dialogState,
    openCreate,
    openCreateUnscheduled,
    openEdit,
    closeDialog,
  } = useCalendarScreen(params);
  const days = buildWeekDays(weekStart, today);

  return (
    <main className="relative isolate mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 text-foreground md:p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WeekView
            days={days}
            entries={entries}
            nav={nav}
            onCreate={openCreate}
            onEdit={openEdit}
          />
        </div>
        <div className="flex flex-col gap-6">
          {/* key 绑 URL 周所在月：跨月翻周/点日跳周重挂载回落所在月，
              同月内翻周不重挂载、手动翻月态保留 */}
          <MiniMonthCard
            key={weekStart.slice(0, 7)}
            weekStart={weekStart}
            today={today}
            weekDates={days.map((day) => day.date)}
            onSelect={selectDate}
          />
          <TodayPanel
            today={today}
            entries={todaysSchedule}
            onEdit={openEdit}
          />
          {/* 新建落点：今天在查看周落今天，否则落周一——新条目必落当前周，卡片立即可见 */}
          <UnscheduledPanel
            entries={weekUnscheduled}
            onCreate={() =>
              openCreateUnscheduled(
                days.some((day) => day.isToday) ? today : weekStart,
              )
            }
            onEdit={openEdit}
          />
        </div>
      </div>
      <WeekEntryDialog state={dialogState} onClose={closeDialog} />
    </main>
  );
}

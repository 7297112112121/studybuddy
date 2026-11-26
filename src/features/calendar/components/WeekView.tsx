"use client";

/**
 * 周视图组合层：接屏状态机（useWeekView），接线星期表头、全天区、时间
 * 网格与编辑卡；自身零状态，整周空态由本层条件渲染。
 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import type { WeekDay } from "../dates";
import { useWeekView } from "../useWeekView";
import AllDayLane from "./AllDayLane";
import WeekEntryDialog from "./WeekEntryDialog";
import WeekHeader from "./WeekHeader";
import WeekTimeGrid from "./WeekTimeGrid";

type WeekViewProps = {
  /** 恰 7 项，页面组合层经 buildWeekDays 产出。 */
  days: WeekDay[];
  /** 该周全部条目。 */
  entries: CalendarEntryView[];
};

export default function WeekView({ days, entries }: WeekViewProps) {
  const t = useTranslations("calendar");
  const {
    scrollRef,
    dialogState,
    openCreate,
    openEdit,
    closeDialog,
    nowMinutes,
    hasToday,
    byDate,
  } = useWeekView(days, entries);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/25 bg-aurora-ink/40 p-3 md:p-4">
      {/* 单一横滚容器：表头/全天区/网格同步滚动，纵轴列不错位 */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <WeekHeader days={days} />
          <AllDayLane days={days} byDate={byDate} onEdit={openEdit} />
          {entries.length === 0 && (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              {t("week.emptyWeek")}
            </p>
          )}
          <div
            ref={scrollRef}
            data-testid="week-scroll"
            className="max-h-[26rem] overflow-y-auto"
          >
            <WeekTimeGrid
              days={days}
              byDate={byDate}
              nowMinutes={nowMinutes}
              hasToday={hasToday}
              onCreate={openCreate}
              onEdit={openEdit}
            />
          </div>
        </div>
      </div>
      <WeekEntryDialog state={dialogState} onClose={closeDialog} />
    </div>
  );
}

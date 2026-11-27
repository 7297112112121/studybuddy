"use client";

/**
 * 周视图组合层：接屏状态机（useWeekView），接线卡片头部翻周链接、星期
 * 表头与时间网格；编辑卡开合在页面级屏状态机，本层只承接回调
 * 透传；自身零状态，整周空态由本层条件渲染。
 */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import type { WeekDay } from "../dates";
import type { CalendarNavLinks } from "../useCalendarScreen";
import { useWeekView } from "../useWeekView";
import WeekHeader from "./WeekHeader";
import WeekTimeGrid from "./WeekTimeGrid";

type WeekViewProps = {
  /** 恰 7 项，页面组合层经 buildWeekDays 产出。 */
  days: WeekDay[];
  /** 该周全部条目。 */
  entries: CalendarEntryView[];
  /** 翻周链接（前/今天/后），页面组合层派生。 */
  nav: CalendarNavLinks;
  /** 槽位/色块点击回调（编辑卡开合态在页面级）。 */
  onCreate: (date: string, slotMinutes: number) => void;
  onEdit: (entry: CalendarEntryView) => void;
};

export default function WeekView({
  days,
  entries,
  nav,
  onCreate,
  onEdit,
}: WeekViewProps) {
  const t = useTranslations("calendar");
  const { scrollRef, nowMinutes, hasToday, byDate } = useWeekView(
    days,
    entries,
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/25 bg-aurora-ink/40 p-3 md:p-4">
      {/* 卡片头部：翻周落点（原页级导航的周臂上移，周即页面唯一主轴） */}
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link href={nav.prevHref} aria-label={t("week.prevWeek")}>
            <ChevronLeft />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={nav.todayHref}>{t("week.today")}</Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href={nav.nextHref} aria-label={t("week.nextWeek")}>
            <ChevronRight />
          </Link>
        </Button>
      </div>
      {/* 单一横滚容器：表头/全天区/网格同步滚动，纵轴列不错位 */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <WeekHeader days={days} />
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
              onCreate={onCreate}
              onEdit={onEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

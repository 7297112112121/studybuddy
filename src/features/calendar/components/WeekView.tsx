"use client";

/**
 * 周视图组合层：接线卡片头部翻周链接、星期表头与时间网格；实时线时钟
 * （useNowMinutes）与纵向滚动锚定内联本层；编辑卡开合在页面组合层，本层
 * 只承接回调透传；整周空态与导航读域失败态由本层条件渲染。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CalendarEntryView } from "@/validation/calendar-response";

import type { CalendarNavLinks } from "../routes";
import { groupEntriesByDate, PX_PER_MINUTE, type WeekDay } from "../utils";
import WeekHeader from "./WeekHeader";
import WeekTimeGrid from "./WeekTimeGrid";

/** 非今天所在周的滚动锚点（08:00）。 */
const NON_TODAY_ANCHOR_MINUTES = 8 * 60;
/** 打开即锚定当前时段前两小时，免切换即可见实时线。 */
const ANCHOR_LOOKBACK_MINUTES = 120;

/** 客户端本地时钟的当日分钟数（0–1439），每分钟更新一次。 */
function useNowMinutes(): number {
  const [nowMinutes, setNowMinutes] = useState<number>(localNowMinutes);

  // 实时线随客户端本地时钟每分钟更新一次位置
  useEffect(() => {
    const timer = setInterval(() => setNowMinutes(localNowMinutes()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return nowMinutes;
}

/** 客户端本地时钟 → 当日分钟数。 */
function localNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

type WeekViewProps = {
  /** 恰 7 项，页面组合层经 buildWeekDays 产出。 */
  days: WeekDay[];
  /** 该周全部条目。 */
  entries: CalendarEntryView[];
  /** 翻周链接（前/今天/后）。 */
  nav: CalendarNavLinks;
  /** 导航读域加载失败：呈现失败文案与重试，替代整周空态。 */
  loadFailed: boolean;
  /** 失败重试：重载当前读域。 */
  onRetry: () => void;
  /** 槽位/色块点击回调（编辑卡开合态在页面级）。 */
  onCreate: (date: string, slotMinutes: number) => void;
  onEdit: (entry: CalendarEntryView) => void;
};

export default function WeekView({
  days,
  entries,
  nav,
  loadFailed,
  onRetry,
  onCreate,
  onEdit,
}: WeekViewProps) {
  const t = useTranslations("calendar");
  const nowMinutes = useNowMinutes();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasToday = days.some((day) => day.isToday);
  const byDate = useMemo(() => groupEntriesByDate(entries), [entries]);

  // 打开即锚定当前时段；非今天所在周锚 08:00
  const anchorRef = useRef<number | null>(null);
  if (anchorRef.current === null) {
    anchorRef.current =
      (hasToday ? nowMinutes : NON_TODAY_ANCHOR_MINUTES) -
      ANCHOR_LOOKBACK_MINUTES;
  }
  useEffect(() => {
    const element = scrollRef.current;
    if (element && anchorRef.current !== null) {
      element.scrollTop = Math.max(0, anchorRef.current * PX_PER_MINUTE);
    }
  }, []);

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
          {loadFailed ? (
            <div
              role="alert"
              className="flex items-center justify-center gap-3 py-8"
            >
              <p className="text-sm text-muted-foreground">
                {t("week.loadFailed")}
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t("week.retry")}
              </Button>
            </div>
          ) : (
            entries.length === 0 && (
              <p
                className="py-8 text-center text-sm text-muted-foreground"
                role="status"
              >
                {t("week.emptyWeek")}
              </p>
            )
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

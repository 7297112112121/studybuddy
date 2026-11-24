"use client";

/**
 * 日历页客户端屏（/calendar 薄壳的全部 UI 承载，数据流向评审裁决 1）。
 *
 * 职责：视图态解析（自 page.tsx 下沉，缺省/非法静默回退语义不变）、
 * 条目数据经日历 store 订阅（读写一律统一接口）、周/月导航。
 * presentational 组件（WeekView/CalendarScreen）保持 props 纯展示。
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addMonths,
  addWeeks,
  buildWeekDays,
  weekStartFor,
} from "../date-nav";
import {
  isValidWeekStart,
  isValidYearMonth,
} from "@/modules/calendar/validators";
import { useCalendarStore } from "@/stores/calendar";

import CalendarScreen from "./CalendarScreen";
import WeekView from "./WeekView";

/** searchParams wire 形状(与 /calendar?view=&week=&month= 一致)。 */
export type CalendarPageParams = { view?: string; week?: string; month?: string };

/** 数字 → "M"/"MM" 零填充。 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** year/month → "YYYY-MM"(searchParams wire 格式)。 */
function monthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/** ?month= 解析:合法 "YYYY-MM"(真实月)才采纳,否则 null 回退当前月。 */
function parseMonthParam(
  raw: string | undefined,
): { year: number; month: number } | null {
  if (raw === undefined || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const [year, month] = raw.split("-").map(Number);
  if (!isValidYearMonth(year, month)) return null;
  return { year, month };
}

/** 视图态解析结果:周(周一锚点)或月(年月),即日历 store 读域。 */
type CalendarViewParams =
  | { view: "week"; weekStart: string }
  | { view: "month"; year: number; month: number };

/**
 * searchParams → 视图态(design「路由行为落点表」#2):
 * 缺省/非法一律静默回退(周:今天所在周;月:当前月),不报错。
 */
function parseViewParams(
  params: CalendarPageParams,
  today: string,
): CalendarViewParams {
  if (params.view === "month") {
    const shown = parseMonthParam(params.month) ?? {
      year: Number(today.slice(0, 4)),
      month: Number(today.slice(5, 7)),
    };
    return { view: "month", year: shown.year, month: shown.month };
  }
  const weekStart =
    params.week !== undefined && isValidWeekStart(params.week)
      ? params.week
      : weekStartFor(today);
  return { view: "week", weekStart };
}

/** 本地今天("YYYY-MM-DD"):mount 期定格一次,避免逐渲染漂移。 */
function useToday(): string {
  const [today] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  });
  return today;
}

export default function CalendarPageClient({
  params,
}: {
  params: CalendarPageParams;
}) {
  const t = useTranslations("calendar");
  const today = useToday();
  const load = useCalendarStore((s) => s.load);
  const entries = useCalendarStore((s) => s.entries);
  // params 由薄壳 page 传入:同一次导航内引用稳定,store 更新引发的重渲染
  // 不会重建;跨导航由 page 侧新 searchParams 触发重建。
  const shown = useMemo(
    () => parseViewParams(params, today),
    [params, today],
  );

  // 数据经 store 读域加载(评审裁决 1:RSC 首屏直读废除)
  useEffect(() => {
    void load(shown);
  }, [load, shown]);

  // 周/月切换(路由行为 #3):月默认当前月并携带周锚点;周回到锚点所在周。
  const currentWeekStart = weekStartFor(today);
  const carriedWeek =
    params.week !== undefined && isValidWeekStart(params.week)
      ? params.week
      : currentWeekStart;
  const weekHref = `/calendar?week=${carriedWeek}`;
  const monthHref = `/calendar?view=month&month=${monthParam(Number(today.slice(0, 4)), Number(today.slice(5, 7)))}&week=${carriedWeek}`;

  return (
    <main className="relative isolate mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 text-foreground md:p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
      <nav className="flex flex-wrap items-center gap-1">
        {/* 周/月切换:分段控件(路由行为 #3) */}
        <Button
          variant={shown.view === "week" ? "default" : "ghost"}
          size="sm"
          asChild
        >
          <Link
            href={weekHref}
            aria-current={shown.view === "week" ? "true" : undefined}
          >
            {t("week.viewWeek")}
          </Link>
        </Button>
        <Button
          variant={shown.view === "month" ? "default" : "ghost"}
          size="sm"
          asChild
        >
          <Link
            href={monthHref}
            aria-current={shown.view === "month" ? "true" : undefined}
          >
            {t("week.viewMonth")}
          </Link>
        </Button>
        {shown.view === "week" ? (
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/calendar?week=${addWeeks(shown.weekStart, -1)}`}
                aria-label={t("week.prevWeek")}
              >
                <ChevronLeft />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/calendar?week=${currentWeekStart}`}>
                {t("week.today")}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/calendar?week=${addWeeks(shown.weekStart, 1)}`}
                aria-label={t("week.nextWeek")}
              >
                <ChevronRight />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/calendar?view=month&month=${monthParam(addMonths(shown.year, shown.month, -1).year, addMonths(shown.year, shown.month, -1).month)}&week=${carriedWeek}`}
                aria-label={t("page.prevMonth")}
              >
                <ChevronLeft />
              </Link>
            </Button>
            {/* 月份数字是本页的排版主角:大号、tabular-nums */}
            <span className="px-2 text-3xl font-semibold tracking-tight tabular-nums">
              {t("page.monthLabel", { year: shown.year, month: shown.month })}
            </span>
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/calendar?view=month&month=${monthParam(addMonths(shown.year, shown.month, 1).year, addMonths(shown.year, shown.month, 1).month)}&week=${carriedWeek}`}
                aria-label={t("page.nextMonth")}
              >
                <ChevronRight />
              </Link>
            </Button>
          </>
        )}
      </nav>
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

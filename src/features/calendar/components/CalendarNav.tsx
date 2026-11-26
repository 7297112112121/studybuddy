"use client";

/**
 * 日历页导航（纯展示）：周/月分段控件 + 当前视图的前/后落点，内容全由
 * links 驱动。
 */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { CalendarNavLinks } from "../useCalendarScreen";

type CalendarNavProps = {
  view: "week" | "month";
  links: CalendarNavLinks;
};

export default function CalendarNav({ view, links }: CalendarNavProps) {
  const t = useTranslations("calendar");
  return (
    <nav className="flex flex-wrap items-center gap-1">
      <Button variant={view === "week" ? "default" : "ghost"} size="sm" asChild>
        <Link
          href={links.weekTabHref}
          aria-current={view === "week" ? "true" : undefined}
        >
          {t("week.viewWeek")}
        </Link>
      </Button>
      <Button
        variant={view === "month" ? "default" : "ghost"}
        size="sm"
        asChild
      >
        <Link
          href={links.monthTabHref}
          aria-current={view === "month" ? "true" : undefined}
        >
          {t("week.viewMonth")}
        </Link>
      </Button>
      {links.week && (
        <>
          <Button variant="ghost" size="icon" asChild>
            <Link href={links.week.prevHref} aria-label={t("week.prevWeek")}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={links.week.todayHref}>{t("week.today")}</Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={links.week.nextHref} aria-label={t("week.nextWeek")}>
              <ChevronRight />
            </Link>
          </Button>
        </>
      )}
      {links.month && (
        <>
          <Button variant="ghost" size="icon" asChild>
            <Link href={links.month.prevHref} aria-label={t("page.prevMonth")}>
              <ChevronLeft />
            </Link>
          </Button>
          {/* 月份数字是本页的排版主角：大号、tabular-nums */}
          <span className="px-2 text-3xl font-semibold tracking-tight tabular-nums">
            {t("page.monthLabel", {
              year: links.month.year,
              month: links.month.month,
            })}
          </span>
          <Button variant="ghost" size="icon" asChild>
            <Link href={links.month.nextHref} aria-label={t("page.nextMonth")}>
              <ChevronRight />
            </Link>
          </Button>
        </>
      )}
    </nav>
  );
}

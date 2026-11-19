/**
 * /calendar 日程日历页(AXY-22 路由行为 #1 + AXY-23 D-02/路由行为 #2)。
 *
 * 视图态经 searchParams 承载(design「UI 与组件」节,proposal 开放问题 #1
 * 闭合:入 URL,与月导航 ?month= 先例同构):
 * - 无 view 参数(或缺省)= 周视图,默认今天所在周;?week=YYYY-MM-DD(须为
 *   周一)指定周,非法/缺省经 isValidWeekStart 静默回退,不报错;
 * - ?view=month&month=YYYY-MM = 月视图(AXY-22 既有行为);?week= 锚点随行,
 *   切回周视图保持所在周(路由行为 #3)。
 * 守卫零新增:继承 (app)/layout 既有服务端 redirect,此处再次读取会话取
 * userId(纵深防御,与 workbench 先例同款)。读走 props 下行(ADR-0025,
 * 无 TanStack Query)。
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { getCurrentSession } from "@/modules/auth";
import CalendarScreen from "@/modules/calendar/components/CalendarScreen";
import WeekView from "@/modules/calendar/components/WeekView";
import { addMonths } from "@/modules/calendar/month";
import {
  listEntryResources,
  listMonthEntries,
  listWeekEntries,
} from "@/modules/calendar/queries";
import {
  addWeeks,
  buildWeekDays,
  isValidWeekStart,
  weekStartFor,
} from "@/modules/calendar/week";

export const instant = false;

type CalendarSearchParams = { view?: string; week?: string; month?: string };

/** 数字 → "M"/"MM" 零填充。 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** year/month → "YYYY-MM"(searchParams wire 格式)。 */
function monthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/** ?month= 解析:合法 "YYYY-MM"(真实月)才采纳,否则 null 回退当前月。 */
function parseMonthParam(raw: string | undefined): { year: number; month: number } | null {
  if (raw === undefined || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const [year, month] = raw.split("-").map(Number);
  if (month < 1 || month > 12 || year < 1 || year > 9999) return null;
  return { year, month };
}

/** 视图态解析结果:周(周一锚点)或月(年月)。 */
type CalendarViewParams =
  | { view: "week"; weekStart: string }
  | { view: "month"; year: number; month: number };

/**
 * searchParams → 视图态(design「路由行为落点表」#2):
 * 缺省/非法一律静默回退(周:今天所在周;月:当前月),不报错。
 */
function parseViewParams(
  params: CalendarSearchParams,
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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const params = await searchParams;
  const session = await getCurrentSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const shown = parseViewParams(params, today);
  const currentWeekStart = weekStartFor(today);

  const [entries, t] = await Promise.all([
    shown.view === "week"
      ? listWeekEntries(session.user.id, shown.weekStart)
      : listMonthEntries(session.user.id, shown.year, shown.month),
    getTranslations("calendar"),
  ]);
  // AXY-24 T7:条目附属资料(仅月视图当日详情展示),账号隔离由查询传导
  const resources =
    shown.view === "month"
      ? await listEntryResources(
          session.user.id,
          [...new Set(entries.map((e) => e.date))],
        )
      : undefined;

  // 周/月切换(路由行为 #3):月默认当前月并携带周锚点;周回到锚点所在周。
  const carriedWeek =
    params.week !== undefined && isValidWeekStart(params.week)
      ? params.week
      : currentWeekStart;
  const weekHref = `/calendar?week=${carriedWeek}`;
  const monthHref = `/calendar?view=month&month=${monthParam(now.getFullYear(), now.getMonth() + 1)}&week=${carriedWeek}`;

  return (
    <main className="relative isolate mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 text-foreground md:p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
      <nav className="flex flex-wrap items-center gap-1">
        {/* 周/月切换:分段控件,服务端 Link(路由行为 #3) */}
        <Button
          variant={shown.view === "week" ? "default" : "ghost"}
          size="sm"
          asChild
        >
          <Link href={weekHref} aria-current={shown.view === "week" ? "true" : undefined}>
            {t("week.viewWeek")}
          </Link>
        </Button>
        <Button
          variant={shown.view === "month" ? "default" : "ghost"}
          size="sm"
          asChild
        >
          <Link href={monthHref} aria-current={shown.view === "month" ? "true" : undefined}>
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
          resources={resources}
        />
      )}
    </main>
  );
}

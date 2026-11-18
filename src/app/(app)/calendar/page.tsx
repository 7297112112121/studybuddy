/**
 * /calendar 日程日历页（AXY-22 design「UI 与组件」节，路由行为 #1）。
 *
 * RSC 读路径：searchParams ?month=YYYY-MM 决定展示月（Next 16 为 Promise，
 * 须 await），缺省/非法回退服务器当前月（Review Focus #3）；守卫零新增
 * ——继承 (app)/layout 既有服务端 redirect，此处再次读取会话取 userId，
 * 类型收窄前提下保留同一守卫动作（纵深防御，与 workbench 先例同款）。
 * 月导航为服务端 <Link>（href 带相邻月 query，经 addMonths 计算），
 * RSC 重取，无客户端路由状态。读走 props 下行（ADR-0025，无 TanStack Query）。
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { getCurrentSession } from "@/modules/auth";
import CalendarScreen from "@/modules/calendar/components/CalendarScreen";
import { addMonths } from "@/modules/calendar/month";
import { listMonthEntries } from "@/modules/calendar/queries";

export const instant = false;

type CalendarSearchParams = { month?: string };

/** 数字 → "M"/"MM" 零填充。 */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** year/month → "YYYY-MM"（searchParams wire 格式）。 */
function monthParam(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/** ?month= 解析：合法 "YYYY-MM"（真实月）才采纳，否则 null 回退当前月。 */
function parseMonthParam(raw: string | undefined): { year: number; month: number } | null {
  if (raw === undefined || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const [year, month] = raw.split("-").map(Number);
  if (month < 1 || month > 12 || year < 1 || year > 9999) return null;
  return { year, month };
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
  const shown = parseMonthParam(params.month) ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const [entries, t] = await Promise.all([
    listMonthEntries(session.user.id, shown.year, shown.month),
    getTranslations("calendar"),
  ]);
  const prev = addMonths(shown.year, shown.month, -1);
  const next = addMonths(shown.year, shown.month, 1);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
      <nav className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/calendar?month=${monthParam(prev.year, prev.month)}`}
            aria-label={t("page.prevMonth")}
          >
            <ChevronLeft />
          </Link>
        </Button>
        {/* 月份数字是本页的排版主角：大号、tabular-nums */}
        <span className="px-2 text-3xl font-semibold tracking-tight tabular-nums">
          {t("page.monthLabel", { year: shown.year, month: shown.month })}
        </span>
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/calendar?month=${monthParam(next.year, next.month)}`}
            aria-label={t("page.nextMonth")}
          >
            <ChevronRight />
          </Link>
        </Button>
      </nav>
      <CalendarScreen
        year={shown.year}
        month={shown.month}
        today={today}
        entries={entries}
      />
    </main>
  );
}

"use client";

/**
 * 日历页组合层：订阅日历 store 双读域（导航域随 URL 周锚装载、今日域锚定
 * 今天所在周，失败态与重试接线周视图），接路由词汇与日期工具派生导航链接
 * 与读域过滤；编辑卡开合（薄瞬态）内联本层。断点依内容：周网格 min-w-720
 * + 侧栏 360 → xl 起双栏，以下纵向堆叠。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { load, loadToday } from "@/api/calendar-sync";
import { useApiFailureHandler } from "@/api/failure";
import { localToday } from "@/common/date";
import type { ApiFailure } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import { useCalendarStore } from "@/stores/calendar";

import {
  parseWeekParam,
  weekHref,
  weekNavLinks,
  type CalendarPageParams,
} from "../routes";
import {
  buildWeekDays,
  selectTodaysSchedule,
  selectWeekUnscheduled,
  slotPrefillEnd,
  slotPrefillStart,
  weekStartFor,
} from "../utils";
import type { WeekEntryDialogState } from "./WeekEntryDialog";
import MiniMonthCard from "./MiniMonthCard";
import TodayPanel from "./TodayPanel";
import UnscheduledPanel from "./UnscheduledPanel";
import WeekEntryDialog from "./WeekEntryDialog";
import WeekView from "./WeekView";

/** 本地今天（"YYYY-MM-DD"）：mount 期定格一次，避免逐渲染漂移。 */
function useToday(): string {
  const [today] = useState(localToday);
  return today;
}

export default function CalendarPageClient({
  params,
}: {
  params: CalendarPageParams;
}) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const today = useToday();
  const entries = useCalendarStore((s) => s.entries);
  const todayEntries = useCalendarStore((s) => s.todayEntries);
  const loadError = useCalendarStore((s) => s.loadError);
  const handleApiFailure = useApiFailureHandler();

  // params 由薄壳 page 传入：同一次导航内引用稳定；跨导航由 page 侧新
  // searchParams 触发重建。
  const weekStart = parseWeekParam(params, today);

  // 读域契约失败分派:未授权(UNAUTHORIZED)跳登录由策略承接,
  // 技术失败已落读域失败态(loadError),此处无呈现动作
  const dispatchReadFailure = useCallback(
    async (result: ApiFailure): Promise<void> => {
      await handleApiFailure(result, { onFailure: () => {} });
    },
    [handleApiFailure],
  );

  // 导航域装载与失败重试共用同一链:load 返回新鲜契约结果(null 即过期丢弃)
  const retry = useCallback(async (): Promise<void> => {
    const data = await load(weekStart);
    if (data !== null && !data.ok) {
      await dispatchReadFailure(data);
    }
  }, [weekStart, dispatchReadFailure]);

  // 数据经读/写编排装载双读域：导航域随定位变化，今日域锚定今天所在周
  useEffect(() => {
    void retry();
  }, [retry]);
  useEffect(() => {
    void loadToday(weekStartFor(today));
  }, [today]);

  // 两卡按有无开始时间二分：今日卡只收已安排时间，无时间归右栏未安排卡（互斥，交集恒空）
  const todaysSchedule = useMemo(
    () => selectTodaysSchedule(todayEntries, today),
    [todayEntries, today],
  );
  const weekUnscheduled = useMemo(
    () => selectWeekUnscheduled(entries),
    [entries],
  );

  // 迷你月历点日 → 跳该日所在周（周一锚），周视图与迷你月历高亮随之联动
  const selectDate = (date: string) => {
    router.push(weekHref(date));
  };

  const nav = weekNavLinks(weekStart, today);

  // 编辑卡开合：create 模式带日期与槽预填（双预填空串即不预填，右栏未安排
  // 卡新建），edit 模式带原条目；周网格与今日日程共用同一开合态。
  const [dialogState, setDialogState] = useState<WeekEntryDialogState | null>(
    null,
  );
  const openCreate = (date: string, slotMinutes: number) => {
    setDialogState({
      mode: "create",
      date,
      prefillStart: slotPrefillStart(slotMinutes),
      prefillEnd: slotPrefillEnd(slotMinutes),
    });
  };
  const openCreateUnscheduled = (date: string) => {
    setDialogState({
      mode: "create",
      date,
      prefillStart: "",
      prefillEnd: "",
    });
  };
  const openEdit = (entry: CalendarEntryView) => {
    setDialogState({ mode: "edit", entry });
  };
  const closeDialog = () => setDialogState(null);

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
            loadFailed={loadError}
            onRetry={() => void retry()}
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
            loadFailed={loadError}
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

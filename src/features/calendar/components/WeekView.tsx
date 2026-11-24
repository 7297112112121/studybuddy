"use client";

/**
 * 周视图主体(AXY-23 design「UI 与组件」节)。
 *
 * 结构自上而下:星期表头(周一首,今日列高亮,D-07)→ 全天区横栏(无时间
 * 条目,点击编辑,D-06)→ 时间网格(00–24 时,30 分钟槽 F-05,带时间条目
 * 经 layoutDayBlocks 渲染为色块:重叠簇并列均分、时间点条目 30 分钟高
 * D-12)→ 实时线(客户端本地时钟,60s 更新 F-06;仅今天所在周渲染 D-05)。
 * 表头/全天区/网格同处一个横滚容器,窄屏横向滚动不互相错位(D-09);
 * 纵向滚动容器初始锚定当前时段,非今天所在周锚 08:00(D-10)。
 * 全部配色走全局语义 token,零新色值。
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "cn";

import type { CalendarEntryView } from "@/modules/calendar/queries";
import type { WeekDay } from "../date-nav";
import { layoutDayBlocks, slotPrefillStart } from "../useClientScreen";
import WeekEntryDialog, { type WeekEntryDialogState } from "./WeekEntryDialog";

const PX_PER_MINUTE = 2;
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 48
const GRID_HEIGHT = 24 * 60 * PX_PER_MINUTE;
const NON_TODAY_ANCHOR_MINUTES = 8 * 60;

type WeekViewProps = {
  /** 恰 7 项,page.tsx 经 buildWeekDays 产出。 */
  days: WeekDay[];
  /** 该周全部条目(listWeekEntries 结果)。 */
  entries: CalendarEntryView[];
};

/** 客户端本地时钟 → 当日分钟数(F-06 时间源)。 */
function clientNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** 分钟数 → "HH:MM"(零填充,刻度与实时线标签共用)。 */
function hhmm(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 条目时间标注:时间段「HH:MM–HH:MM」/ 时间点「HH:MM」。 */
function timeLabel(entry: CalendarEntryView): string {
  return entry.endTime === null
    ? (entry.startTime as string)
    : `${entry.startTime}–${entry.endTime}`;
}

export default function WeekView({ days, entries }: WeekViewProps) {
  const t = useTranslations("calendar");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dialogState, setDialogState] = useState<WeekEntryDialogState | null>(
    null,
  );

  const [nowMinutes, setNowMinutes] = useState<number>(clientNowMinutes);
  const hasToday = days.some((d) => d.isToday);

  // F-06:实时线随客户端本地时钟每分钟更新一次位置。
  useEffect(() => {
    const timer = setInterval(() => setNowMinutes(clientNowMinutes()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // D-10:打开即锚定当前时段(免切换可见实时线);非今天所在周锚 08:00。
  const anchorRef = useRef<number | null>(null);
  if (anchorRef.current === null) {
    anchorRef.current =
      (hasToday ? clientNowMinutes() : NON_TODAY_ANCHOR_MINUTES) - 120;
  }
  useEffect(() => {
    const el = scrollRef.current;
    if (el && anchorRef.current !== null) {
      el.scrollTop = Math.max(0, anchorRef.current * PX_PER_MINUTE);
    }
  }, []);

  const byDate = new Map<string, CalendarEntryView[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) {
      list.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/25 bg-aurora-ink/40 p-3 md:p-4">
      {/* 外层卡面与月视图网格卡同款(CalendarScreen/DayPanel 统一形态);
          单一横滚容器:表头/全天区/网格同步滚动,纵轴列 sticky 不错位(D-09) */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* 星期表头:星期名 + 日期数字两行堆叠;今天日期数字 primary 胶囊 */}
          <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
            <div />
            {days.map((d) => (
              <div
                key={d.date}
                data-testid={`week-col-${d.date}`}
                aria-current={d.isToday ? "date" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pb-2",
                  d.isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="text-xs font-medium">
                  {t(`weekday.${d.weekdayKey}`)}
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold tabular-nums",
                    d.isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.date.slice(8)}
                </span>
              </div>
            ))}
          </div>
          {/* 全天区(D-06):无时间条目,点击编辑 */}
          <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-y border-border">
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              {t("week.allDay")}
            </div>
            {days.map((d) => (
              <div key={d.date} className="flex flex-col gap-1 px-0.5 py-1">
                {(byDate.get(d.date) ?? [])
                  .filter((e) => e.startTime === null)
                  .map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      data-testid={`all-day-${e.id}`}
                      onClick={() => setDialogState({ mode: "edit", entry: e })}
                      className="truncate rounded-full bg-accent px-2 py-0.5 text-left text-xs hover:bg-accent/70"
                    >
                      {e.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
          {/* 空态(E-04):整周无条目 */}
          {entries.length === 0 && (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              {t("week.emptyWeek")}
            </p>
          )}
          {/* 时间网格:纵向滚动,打开即锚定当前时段(D-10) */}
          <div
            ref={scrollRef}
            data-testid="week-scroll"
            className="max-h-[26rem] overflow-y-auto"
          >
            <div
              className="relative grid grid-cols-[3rem_repeat(7,1fr)]"
              style={{ height: GRID_HEIGHT }}
            >
              {/* 纵轴刻度(小时):实时线到达整点时该小时标签高亮(destructive,
                  与线同色;随每分钟状态自动切换) */}
              <div className="relative">
                {Array.from({ length: 24 }, (_, h) => {
                  const isNowHour = hasToday && nowMinutes === h * 60;
                  return (
                    <div
                      key={h}
                      data-testid={`week-hour-${h}`}
                      className={cn(
                        "absolute right-1 -translate-y-1/2 text-xs tabular-nums",
                        isNowHour
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground",
                      )}
                      style={{ top: h * 60 * PX_PER_MINUTE }}
                    >
                      {hhmm(h * 60)}
                    </div>
                  );
                })}
              </div>
              {days.map((d) => {
                const dayEntries = byDate.get(d.date) ?? [];
                const blocks = layoutDayBlocks(
                  dayEntries.filter((e) => e.startTime !== null),
                );
                return (
                  <div
                    key={d.date}
                    className="relative border-l border-border/60"
                  >
                    {/* 48 槽(F-05):点击打开创建卡,时间预填槽起点 */}
                    {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={t("week.createAt", {
                          weekday: t(`weekday.${d.weekdayKey}`),
                          time: hhmm(i * SLOT_MINUTES),
                        })}
                        onClick={() =>
                          setDialogState({
                            mode: "create",
                            date: d.date,
                            prefillStart: slotPrefillStart(i * SLOT_MINUTES),
                          })
                        }
                        className="absolute left-0 right-0 border-b border-border/30 hover:bg-accent/40"
                        style={{
                          top: i * SLOT_MINUTES * PX_PER_MINUTE,
                          height: SLOT_MINUTES * PX_PER_MINUTE,
                        }}
                      />
                    ))}
                    {/* 色块:重叠簇并列均分(边界 #2),点击编辑 */}
                    {blocks.map((b) => {
                      const entryData = dayEntries.find(
                        (e) => e.id === b.entryId,
                      );
                      if (entryData === undefined) return null;
                      return (
                        <button
                          key={b.entryId}
                          type="button"
                          data-testid={`week-block-${b.entryId}`}
                          onClick={() =>
                            setDialogState({ mode: "edit", entry: entryData })
                          }
                          className="absolute z-10 flex flex-col overflow-hidden rounded-lg border-l-2 border-primary bg-primary/15 px-1.5 text-left ring-1 ring-primary/40 hover:bg-primary/25 hover:ring-primary/60"
                          style={{
                            top: b.startMinutes * PX_PER_MINUTE,
                            height: b.durationMinutes * PX_PER_MINUTE,
                            left: `${b.leftPercent}%`,
                            width: `${b.widthPercent}%`,
                          }}
                        >
                          <span className="text-[11px] tabular-nums text-primary">
                            {timeLabel(entryData)}
                          </span>
                          <span className="truncate text-xs font-medium">
                            {entryData.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {/* 实时线(D-05/F-06):仅今天所在周渲染。分段样式:
                  容器自身即 1px 淡红底衬(h-px 保证非零包围盒,toBeVisible 依赖),
                  今天列段粗·亮红叠于其上 */}
              {hasToday && (
                <div
                  data-testid="now-line"
                  aria-label={t("week.nowLine", { time: hhmm(nowMinutes) })}
                  className="pointer-events-none absolute right-0 z-20 h-px bg-destructive/40"
                  style={{ left: "3rem", top: nowMinutes * PX_PER_MINUTE }}
                >
                  {/* 左端时间轴内的当前实时时间;整点时由高亮刻度承担,不重复显示 */}
                  {nowMinutes % 60 !== 0 && (
                    <span
                      data-testid="now-line-time"
                      className="absolute right-full top-0 -translate-y-1/2 pr-1 text-[11px] font-semibold tabular-nums text-destructive"
                    >
                      {hhmm(nowMinutes)}
                    </span>
                  )}
                  <div
                    data-testid="now-line-today"
                    className="absolute top-0 h-0.5 -translate-y-1/2 rounded-full bg-destructive"
                    style={{
                      left: `${(days.findIndex((d) => d.isToday) * 100) / 7}%`,
                      width: `${100 / 7}%`,
                    }}
                  >
                    {/* 左端实心圆点锚点(居中于段起点) */}
                    <span
                      data-testid="now-line-dot"
                      className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <WeekEntryDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
      />
    </div>
  );
}

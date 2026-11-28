"use client";

/**
 * 右栏未安排时间卡（纯展示）：渲染当前查看周的无时间条目列表（过滤派生
 * 在屏状态机 useCalendarScreen 的 weekUnscheduled），行首展示周几；读域
 * 失败时呈现失败文案（重试入口收敛在周视图主区）；新建开无时间预填的
 * 编辑卡（落点规则在页面组合层），编辑走页面级编辑卡回调，删除确认由
 * EntryRow 内置状态机承接。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import type { CalendarEntryView } from "@/app/api/calendar/response";

import { weekdayKeyOf } from "../utils";
import EntryRow from "./EntryRow";

type UnscheduledPanelProps = {
  /** 当前查看周的无时间条目（屏状态机 weekUnscheduled 派生产物）。 */
  entries: CalendarEntryView[];
  /** 导航读域加载失败：失败文案替代空态（数据源与周视图同一读域）。 */
  loadFailed: boolean;
  /** 新建无时间条目回调（页面级编辑卡开合态）。 */
  onCreate: () => void;
  /** 编辑回调（页面级编辑卡开合态）。 */
  onEdit: (entry: CalendarEntryView) => void;
};

export default function UnscheduledPanel({
  entries,
  loadFailed,
  onCreate,
  onEdit,
}: UnscheduledPanelProps) {
  const t = useTranslations("calendar");

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-white/25 bg-aurora-ink/40 p-4"
      data-testid="unscheduled-panel"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">
          {t("unscheduled.title")}
        </h2>
        <Button variant="outline" size="sm" onClick={onCreate}>
          {t("unscheduled.create")}
        </Button>
      </header>
      {loadFailed ? (
        <p role="alert" className="text-muted-foreground text-sm">
          {t("week.loadFailed")}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("unscheduled.empty")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              leadingText={t(`weekday.${weekdayKeyOf(entry.date)}`)}
              onEdit={() => onEdit(entry)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

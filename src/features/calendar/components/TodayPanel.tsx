"use client";

/**
 * 今日日程（纯展示）：渲染今天当天已安排时间的条目列表（过滤派生在屏
 * 状态机 useCalendarScreen 的 todaysSchedule）；标题日期为纯函数排版派生；
 * 编辑走页面级编辑卡回调，删除确认由 EntryRow 内置状态机承接。
 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { formatMonthDay } from "../dates";
import EntryRow from "./EntryRow";

type TodayPanelProps = {
  today: string;
  /** 今天当天已安排时间的条目（屏状态机 todaysSchedule 派生产物）。 */
  entries: CalendarEntryView[];
  /** 编辑回调（页面级编辑卡开合态）。 */
  onEdit: (entry: CalendarEntryView) => void;
};

export default function TodayPanel({
  today,
  entries,
  onEdit,
}: TodayPanelProps) {
  const t = useTranslations("calendar");

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-white/25 bg-aurora-ink/40 p-4"
      data-testid="today-panel"
    >
      <h2 className="text-base font-semibold tracking-tight">
        {formatMonthDay(today)} · 今天
      </h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty.day")}</p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onEdit={() => onEdit(entry)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

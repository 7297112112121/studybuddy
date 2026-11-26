"use client";

/**
 * 今日日程组合层：从今日读域（今天所在周）过滤今天条目，接线 EntryRow
 * 列表；编辑走页面级编辑卡回调，删除确认由 EntryRow 内置状态机承接；
 * 自身零状态。
 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { formatMonthDay } from "../dates";
import EntryRow from "./EntryRow";

type TodayPanelProps = {
  today: string;
  /** 今日读域（今天所在周条目），本层过滤 date === today。 */
  weekEntries: CalendarEntryView[];
  /** 编辑回调（页面级编辑卡开合态）。 */
  onEdit: (entry: CalendarEntryView) => void;
};

export default function TodayPanel({
  today,
  weekEntries,
  onEdit,
}: TodayPanelProps) {
  const t = useTranslations("calendar");
  const todayEntries = weekEntries.filter((entry) => entry.date === today);

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-white/25 bg-aurora-ink/40 p-4"
      data-testid="today-panel"
    >
      <h2 className="text-base font-semibold tracking-tight">
        {formatMonthDay(today)} · 今天
      </h2>
      {todayEntries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty.day")}</p>
      ) : (
        <ul className="flex flex-col">
          {todayEntries.map((entry) => (
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

"use client";

/**
 * 当日面板组合层：接屏状态机（useDayPanel），接线条目行列表与底部表单；
 * 自身零状态。
 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { useDayPanel } from "../useDayPanel";
import EntryForm from "./EntryForm";
import EntryRow from "./EntryRow";

type DayPanelProps = {
  date: string;
  entries: CalendarEntryView[];
  today: string;
};

/** "YYYY-MM-DD" → "M月D日"（去前导零）。 */
function formatMonthDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export default function DayPanel({ date, entries, today }: DayPanelProps) {
  const t = useTranslations("calendar");
  const { editingId, editingEntry, openEdit, clearEditing } =
    useDayPanel(entries);

  const title = formatMonthDay(date) + (date === today ? " · 今天" : "");

  return (
    <section
      className="flex flex-col gap-5 rounded-2xl border border-white/25 bg-aurora-ink/40 p-5 lg:sticky lg:top-6"
      data-testid="day-panel"
    >
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty.day")}</p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onEdit={() => openEdit(entry.id)}
            />
          ))}
        </ul>
      )}

      {/* key 绑定编辑目标：新建→编辑切换时重挂载，useState 初始化器
          重跑完成预填（entry prop 后到不会触发已挂载组件的初始化） */}
      <EntryForm
        key={editingId ?? "create"}
        date={date}
        entry={editingEntry}
        onSaved={clearEditing}
      />
    </section>
  );
}

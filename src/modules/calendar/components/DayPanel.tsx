"use client";

/**
 * 当日详情面板（AXY-22 design「UI 与组件」节）。
 *
 * 标题「M月D日 · 今天」（今日）/「M月D日」（其余）；条目列表（EntryRow，
 * 无条目渲染空态文案「这天还没有安排」，R6）；底部嵌 EntryForm——
 * 编辑模式经本组件本地态切换（EntryRow onEdit → 表单预填被编辑条目，
 * 演示态 3 复用新建表单区）。entries 由服务端按当日过滤后 props 下行。
 */
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "../queries";
import EntryForm from "./EntryForm";
import EntryRow from "./EntryRow";

type DayPanelProps = {
  date: string;
  entries: CalendarEntryView[];
  today: string;
};

/** "YYYY-MM-DD" → "M月D日"（去前导零）。 */
function formatMonthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export default function DayPanel({ date, entries, today }: DayPanelProps) {
  const t = useTranslations("calendar");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingEntry =
    editingId === null
      ? undefined
      : entries.find((e) => e.id === editingId);

  const title =
    formatMonthDay(date) + (date === today ? " · 今天" : "");

  return (
    <section
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6"
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
              onEdit={() => setEditingId(entry.id)}
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
        onSaved={() => setEditingId(null)}
      />
    </section>
  );
}

/**
 * 当日面板屏状态机：编辑目标 id 与预填条目派生——
 * 当日面板组合层（DayPanel）的唯一状态来源。
 */
import { useState } from "react";

import type { CalendarEntryView } from "@/modules/calendar/queries";

export function useDayPanel(entries: CalendarEntryView[]) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingEntry =
    editingId === null
      ? undefined
      : entries.find((entry) => entry.id === editingId);

  return {
    editingId,
    editingEntry,
    openEdit: (id: string) => setEditingId(id),
    clearEditing: () => setEditingId(null),
  };
}

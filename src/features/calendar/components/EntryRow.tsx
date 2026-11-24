"use client";

/**
 * 条目行（AXY-22 design「UI 与组件」节）。
 *
 * 行文案：「HH:MM–HH:MM title」（时间段）/「HH:MM title」（时间点）/
 * 「title」（不带时间），值经 queries 层 formatHhmm 归一（秒位不泄漏）。
 * 「编辑」→ onEdit 回调（DayPanel 切编辑模式）；「删除」→ shadcn
 * AlertDialog 二次确认（D-08：确认层无额外输入），确认后经日历 store
 * deleteEntry 走统一接口；NOT_FOUND → store 按当前读域静默重取。
 */
import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import type { CalendarEntryView } from "@/modules/calendar/queries";
import { useCalendarStore } from "@/stores/calendar";

type EntryRowProps = {
  entry: CalendarEntryView;
  onEdit: () => void;
};

/** 时间前缀：双时间「HH:MM–HH:MM」、仅开始「HH:MM」、无时间 null。 */
function timePrefix(entry: CalendarEntryView): string | null {
  if (entry.startTime === null) return null;
  return entry.endTime === null
    ? entry.startTime
    : `${entry.startTime}–${entry.endTime}`;
}

export default function EntryRow({ entry, onEdit }: EntryRowProps) {
  const t = useTranslations("calendar");
  const deleteEntry = useCalendarStore((s) => s.deleteEntry);
  const resync = useCalendarStore((s) => s.resync);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setIsDeleting(true);
    const result = await deleteEntry(entry.id);
    setIsDeleting(false);
    setConfirmOpen(false);
    if (!result.ok && result.error === "NOT_FOUND") {
      // 条目已被他端删除:按当前读域静默重取
      await resync();
    }
  }

  const time = timePrefix(entry);

  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="w-24 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">
        {time}
      </span>
      {/* 时间轨：竖线贯通行高，节点对齐行首——无时间条目留空时间格，
          但仍占轨上节点（条目在场即有事项，与时间无关） */}
      <span aria-hidden="true" className="relative w-3 shrink-0 self-stretch">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        <span className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{entry.title}</span>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {t("entry.edit")}
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => setConfirmOpen(true)}
              >
                {t("entry.delete")}
              </Button>
              <AlertDialogContent>
                <AlertDialogTitle>{t("entry.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{entry.title}</AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmOpen(false)}>
                    {t("entry.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete}>
                    {t("entry.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </li>
  );
}

"use client";

/**
 * 条目行（AXY-22 design「UI 与组件」节）。
 *
 * 行文案：「HH:MM–HH:MM title」（时间段）/「HH:MM title」（时间点）/
 * 「title」（不带时间），值经 queries 层 formatHhmm 归一（秒位不泄漏）。
 * 「编辑」→ onEdit 回调（DayPanel 切编辑模式）；「删除」→ shadcn
 * AlertDialog 二次确认（D-08：确认层无额外输入），确认后调
 * deleteEntryAction；NOT_FOUND → router.refresh() 静默刷新。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
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

import type { CalendarEntryView } from "../queries";
import { deleteEntryAction } from "../actions";

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
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setIsDeleting(true);
    const result = await deleteEntryAction(entry.id);
    setIsDeleting(false);
    setConfirmOpen(false);
    if (!result.ok && result.error === "NOT_FOUND") {
      router.refresh();
    }
  }

  const time = timePrefix(entry);

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <div className="flex min-w-0 items-baseline gap-2">
        {time && <span className="text-muted-foreground shrink-0">{time}</span>}
        <span className="truncate">{entry.title}</span>
      </div>
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
    </li>
  );
}

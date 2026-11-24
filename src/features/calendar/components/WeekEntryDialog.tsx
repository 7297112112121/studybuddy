"use client";

/**
 * 周视图编辑卡(AXY-23 design「UI 与组件」节)。
 *
 * 呈现形态为 shadcn Dialog(演示态 2/3):create 模式(点空白槽)——日期锁定
 * 所在列、开始时间预填槽起点(F-05,经 EntryForm initialStartTime)、无删除;
 * edit 模式(点色块/全天区条目)——预填原值 + AlertDialog 二次确认删除
 * (AXY-22 D-08 同款,确认层无额外输入)。两模式均 showDateField=false
 * (D-03:编辑卡仅文字+时间两字段,改期仍在月视图表单)。校验与错误呈现
 * (E-01/E-03 字段下方、E-02 提示区)由 EntryForm 既有逻辑承载。
 */
import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { CalendarEntryView } from "@/modules/calendar/queries";
import { useCalendarStore } from "@/stores/calendar";
import EntryForm from "./EntryForm";

export type WeekEntryDialogState =
  | { mode: "create"; date: string; prefillStart: string }
  | { mode: "edit"; entry: CalendarEntryView };

export type WeekEntryDialogProps = {
  state: WeekEntryDialogState | null;
  onClose: () => void;
};

export default function WeekEntryDialog({
  state,
  onClose,
}: WeekEntryDialogProps) {
  const t = useTranslations("calendar");
  const deleteEntry = useCalendarStore((s) => s.deleteEntry);
  const resync = useCalendarStore((s) => s.resync);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (state === null) {
    return null;
  }

  const editing = state.mode === "edit";

  async function handleConfirmDelete(): Promise<void> {
    if (state === null || state.mode !== "edit") return;
    const result = await deleteEntry(state.entry.id);
    setConfirmOpen(false);
    if (!result.ok && result.error === "NOT_FOUND") {
      // 条目已被他端删除:按当前读域静默重取
      await resync();
    }
    onClose();
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("week.dialogEdit") : t("week.dialogCreate")}
            </DialogTitle>
          </DialogHeader>
          {editing ? (
            <EntryForm
              date={state.entry.date}
              entry={state.entry}
              showDateField={false}
              onSaved={onClose}
            />
          ) : (
            <EntryForm
              date={state.date}
              showDateField={false}
              initialStartTime={state.prefillStart}
              onSaved={onClose}
            />
          )}
          {editing && (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmOpen(true)}
              >
                {t("entry.delete")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("entry.confirmTitle")}</AlertDialogTitle>
          {editing && (
            <p className="text-muted-foreground text-sm">{state.entry.title}</p>
          )}
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
    </>
  );
}

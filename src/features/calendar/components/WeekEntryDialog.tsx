"use client";

/**
 * 周视图编辑卡组合层：Dialog 承载表单（EntryForm 双挂载点之一）——create
 * 模式日期锁定所在列、开始时间预填槽起点、无删除；edit 模式预填原值 +
 * 删除（共享删除确认状态机 useEntryDelete，确认层无额外输入，落定后关闭
 * 弹窗）。两模式均不渲染所属日期控件（编辑卡仅文字+时间两字段，改期仍在
 * 月视图表单）。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useEntryDelete } from "../useEntryDelete";
import type { WeekEntryDialogState } from "../useCalendarScreen";
import EntryDeleteConfirm from "./EntryDeleteConfirm";
import EntryForm from "./EntryForm";

export type WeekEntryDialogProps = {
  state: WeekEntryDialogState | null;
  onClose: () => void;
};

export default function WeekEntryDialog({
  state,
  onClose,
}: WeekEntryDialogProps) {
  const t = useTranslations("calendar");
  const { confirmOpen, openConfirm, closeConfirm, confirmDelete } =
    useEntryDelete(onClose);

  if (state === null) {
    return null;
  }

  const editing = state.mode === "edit";

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
                onClick={openConfirm}
              >
                {t("entry.delete")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {state.mode === "edit" && (
        <EntryDeleteConfirm
          open={confirmOpen}
          title={state.entry.title}
          onCancel={closeConfirm}
          onConfirm={() => confirmDelete(state.entry.id)}
        />
      )}
    </>
  );
}

"use client";

/**
 * 周视图编辑卡组合层：Dialog 承载表单（EntryForm 双挂载点之一）——create
 * 模式日期锁定所在列、预填槽起点与默认终点、无删除；edit 模式预填原值 +
 * 删除（删除确认链 useEntryDeleteConfirm，确认层无额外输入，落定后关闭
 * 弹窗）。两模式均不渲染所属日期控件（编辑卡仅文字+时间两字段）。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { CalendarEntryView } from "@/validation/calendar-response";

import { useEntryDeleteConfirm } from "../forms";
import EntryDeleteConfirm from "./EntryDeleteConfirm";
import EntryForm from "./EntryForm";

/** 编辑卡开合态：create 模式带日期，双预填空串即不预填（右栏未安排卡新建），edit 模式带原条目。 */
export type WeekEntryDialogState =
  | {
      mode: "create";
      date: string;
      prefillStart: string;
      prefillEnd: string;
    }
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
  const {
    confirmOpen,
    openConfirm,
    closeConfirm,
    isDeleting,
    deleteError,
    confirmDelete,
  } = useEntryDeleteConfirm(onClose);

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
              initialEndTime={state.prefillEnd}
              onSaved={onClose}
            />
          )}
          {editing && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={openConfirm}
              >
                {t("entry.delete")}
              </Button>
              {/* 删除失败时弹窗保持在场承载文案，落定回调不触发 */}
              {deleteError && (
                <p role="alert" className="text-destructive text-sm">
                  {t("error.deleteFailed")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {state.mode === "edit" && (
        <EntryDeleteConfirm
          open={confirmOpen}
          title={state.entry.title}
          isPending={isDeleting}
          onCancel={closeConfirm}
          onConfirm={() => confirmDelete(state.entry.id)}
        />
      )}
    </>
  );
}

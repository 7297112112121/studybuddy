"use client";

/**
 * 条目删除确认层（纯展示）：条目行与周视图编辑卡共用的二次确认排版，
 * 开合与删除提交由调用方持有的共享删除确认状态机（useEntryDelete）承接；
 * 确认层无额外输入。
 */
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

type EntryDeleteConfirmProps = {
  open: boolean;
  /** 待删条目标题，呈现在确认层描述行。 */
  title: string;
  /** 删除提交中：禁用确认钮，防确认框双击双发。 */
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function EntryDeleteConfirm({
  open,
  title,
  isPending = false,
  onCancel,
  onConfirm,
}: EntryDeleteConfirmProps) {
  const t = useTranslations("calendar");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{t("entry.confirmTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{title}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("entry.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {t("entry.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

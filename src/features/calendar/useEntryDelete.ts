/**
 * 条目删除确认屏状态机（条目行与周视图编辑卡共用）：确认层开合 + 删除
 * 提交链。条目已被他端删除（未找到 NOT_FOUND）时按当前读域静默重取；
 * 落定回调供编辑卡删除后关闭弹窗。
 */
import { useState } from "react";

import { API_ERROR } from "@/common/error";
import { useCalendarStore } from "@/stores/calendar";

export function useEntryDelete(onSettled?: () => void) {
  const deleteEntry = useCalendarStore((s) => s.deleteEntry);
  const resync = useCalendarStore((s) => s.resync);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete(entryId: string): Promise<void> {
    setIsDeleting(true);
    const result = await deleteEntry(entryId);
    setIsDeleting(false);
    setConfirmOpen(false);
    if (!result.ok && result.error === API_ERROR.NOT_FOUND) {
      // 条目已被他端删除：按当前读域静默重取
      await resync();
    }
    onSettled?.();
  }

  return {
    confirmOpen,
    openConfirm: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
    isDeleting,
    confirmDelete,
  };
}

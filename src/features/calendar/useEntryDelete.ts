/**
 * 条目删除确认屏状态机（条目行与周视图编辑卡共用）：确认层开合 + 删除
 * 提交链。未找到（NOT_FOUND）按当前读域静默重取；未授权（UNAUTHORIZED）
 * 跳登录；保存失败与网络异常归一为删除失败文案；落定回调供编辑卡删除
 * 成功后关闭弹窗。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { API_ERROR, type ApiResult } from "@/common/error";
import { ROUTES } from "@/common/routes";
import { useCalendarStore } from "@/stores/calendar";

export function useEntryDelete(onSettled?: () => void) {
  const router = useRouter();
  const deleteEntry = useCalendarStore((s) => s.deleteEntry);
  const resync = useCalendarStore((s) => s.resync);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  function openConfirm(): void {
    setDeleteError(false);
    setConfirmOpen(true);
  }

  function closeConfirm(): void {
    setConfirmOpen(false);
  }

  async function confirmDelete(entryId: string): Promise<void> {
    setIsDeleting(true);
    // 网络/服务异常：fetch reject 与服务端删除失败同归一为删除失败文案，
    // 不向 React 边界抛未捕获异常
    let result: ApiResult;
    try {
      result = await deleteEntry(entryId);
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeleteError(true);
      return;
    }
    setIsDeleting(false);
    setConfirmOpen(false);

    if (result.ok) {
      onSettled?.();
      return;
    }
    switch (result.error) {
      case API_ERROR.UNAUTHORIZED:
        router.replace(ROUTES.login);
        return;
      case API_ERROR.NOT_FOUND:
        // 条目已被他端删除等场景：按当前读域静默重取
        await resync();
        onSettled?.();
        return;
      case API_ERROR.INVALID_INPUT:
      case API_ERROR.SAVE_FAILED:
      case API_ERROR.LOAD_FAILED:
        // 删除无请求体校验，不产出输入无效；穷尽分支与保存失败同呈现
        setDeleteError(true);
        return;
    }
  }

  return {
    confirmOpen,
    openConfirm,
    closeConfirm,
    isDeleting,
    deleteError,
    confirmDelete,
  };
}

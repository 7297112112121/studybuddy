/**
 * 日历域写流程链：条目表单保存链（字段态、校验提交门与契约结果分支）与
 * 删除确认链（确认层开合与删除契约结果分支）。校验提交门与统一接口复验
 * 共用同一 zod schema；契约失败分支统一经客户端失败分支策略
 * （useApiFailureHandler），fetch reject 已由统一接口客户端契约切面
 * （contract）归一为契约码，链内无异常分支。
 */
import { useState, type ChangeEvent, type SubmitEvent } from "react";

import { useApiFailureHandler } from "@/api/contract";
import { toFieldErrors } from "@/common/error";
import { useCalendarStore } from "@/stores/calendar";
import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "@/validation/calendar-request";
import type { CalendarEntryView } from "@/validation/calendar-response";
type UseEntryFormProps = {
  /** 提交日期（新建模式固定；编辑模式被表单内日期控件初值覆盖）。 */
  date: string;
  /** 在场即编辑模式，预填原值。 */
  entry?: CalendarEntryView;
  /** 保存成功回调（父组件据此关闭弹窗/清编辑态）。 */
  onSaved?: () => void;
  /** 新建模式开始时间初值（周视图点击槽预填槽起点）。 */
  initialStartTime?: string;
  /** 新建模式结束时间初值（周视图点击槽预填起点 + 默认 1 小时）。 */
  initialEndTime?: string;
};

/** 条目表单保存链：五字段态、字段错误即时消除、校验提交门（与统一接口
    复验同一 schema）与保存契约分支。表单组合层（EntryForm）的唯一链挂载点。 */
export function useEntryForm(props: UseEntryFormProps) {
  const handleApiFailure = useApiFailureHandler();

  const [title, setTitle] = useState(props.entry?.title ?? "");
  const [content, setContent] = useState(props.entry?.content ?? "");
  const [startTime, setStartTime] = useState(
    props.entry?.startTime ?? props.initialStartTime ?? "",
  );
  const [endTime, setEndTime] = useState(
    props.entry?.endTime ?? props.initialEndTime ?? "",
  );
  const [entryDate, setEntryDate] = useState(props.entry?.date ?? props.date);
  const [fieldErrors, setFieldErrors] = useState<CalendarFieldErrors>({});
  const [formError, setFormError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const entry = props.entry;
  const editing = entry !== undefined;

  /** 对应字段修正后错误即时消除。 */
  function clearFieldError(field: keyof CalendarFieldErrors): void {
    setFieldErrors((prev) =>
      prev[field] === undefined ? prev : { ...prev, [field]: undefined },
    );
  }

  function onTitleChange(event: ChangeEvent<HTMLInputElement>): void {
    setTitle(event.target.value);
    clearFieldError("title");
  }
  function onContentChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setContent(event.target.value);
    clearFieldError("content");
  }
  function onStartTimeChange(event: ChangeEvent<HTMLInputElement>): void {
    setStartTime(event.target.value);
    clearFieldError("startTime");
  }
  function onEndTimeChange(event: ChangeEvent<HTMLInputElement>): void {
    setEndTime(event.target.value);
    clearFieldError("endTime");
  }
  function onDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setEntryDate(event.target.value);
    clearFieldError("date");
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (isPending) return;

    const payload: CalendarEntryInput = {
      date: editing ? entryDate : props.date,
      title,
      content: content === "" ? null : content,
      startTime: startTime === "" ? null : startTime,
      endTime: endTime === "" ? null : endTime,
    };
    const parsed = calendarEntryInputSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setFormError(false);
      return;
    }

    setFieldErrors({});
    setFormError(false);
    const { createEntry, updateEntry } = useCalendarStore.getState();
    setIsPending(true);
    const result = editing
      ? await updateEntry(entry.id, parsed.data)
      : await createEntry(parsed.data);
    setIsPending(false);

    if (result.ok) {
      setTitle("");
      setContent("");
      setStartTime("");
      setEndTime("");
      props.onSaved?.();
      return;
    }
    await handleApiFailure(result, {
      onInvalidInput: setFieldErrors,
      onNotFound: () => void useCalendarStore.getState().resync(),
      onFailure: () => setFormError(true),
    });
  }

  return {
    title,
    content,
    startTime,
    endTime,
    entryDate,
    fieldErrors,
    formError,
    isPending,
    editing,
    onTitleChange,
    onContentChange,
    onStartTimeChange,
    onEndTimeChange,
    onDateChange,
    handleSubmit,
  };
}

/** 删除确认链（条目行与周视图编辑卡共用，各自实例挂载）：确认层开合 +
    删除契约分支。未找到（NOT_FOUND）按当前读域静默重取后落定；落定回调
    供编辑卡删除成功后关闭弹窗。 */
export function useEntryDeleteConfirm(onSettled?: () => void) {
  const handleApiFailure = useApiFailureHandler();
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
    const result = await useCalendarStore.getState().deleteEntry(entryId);
    setIsDeleting(false);
    setConfirmOpen(false);

    if (result.ok) {
      onSettled?.();
      return;
    }
    await handleApiFailure(result, {
      onNotFound: async () => {
        await useCalendarStore.getState().resync();
        onSettled?.();
      },
      onFailure: () => setDeleteError(true),
    });
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

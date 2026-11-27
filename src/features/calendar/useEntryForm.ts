/**
 * 条目表单屏状态机：五字段态、校验提交门（与统一接口复验同一 schema）与
 * 保存链（统一接口判别联合按码分支）。表单组合层（EntryForm）的唯一状态
 * 来源，WeekEntryDialog 唯一挂载点。
 */
import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";

import { API_ERROR, toFieldErrors, type ApiResult } from "@/common/error";
import { ROUTES } from "@/common/routes";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "@/validation/calendar-validators";
import { useCalendarStore } from "@/stores/calendar";

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

export function useEntryForm(props: UseEntryFormProps) {
  const router = useRouter();
  const createEntry = useCalendarStore((s) => s.createEntry);
  const updateEntry = useCalendarStore((s) => s.updateEntry);
  const resync = useCalendarStore((s) => s.resync);

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
    setIsPending(true);
    // 网络/服务异常：fetch reject 与服务端保存失败同归一为表单提示区文案，
    // 不向 React 边界抛未捕获异常
    let result: ApiResult;
    try {
      result = editing
        ? await updateEntry(entry.id, parsed.data)
        : await createEntry(parsed.data);
    } catch {
      setIsPending(false);
      setFormError(true);
      return;
    }
    setIsPending(false);

    if (result.ok) {
      setTitle("");
      setContent("");
      setStartTime("");
      setEndTime("");
      props.onSaved?.();
      return;
    }
    switch (result.error) {
      case API_ERROR.INVALID_INPUT:
        setFieldErrors(result.fieldErrors);
        return;
      case API_ERROR.UNAUTHORIZED:
        router.replace(ROUTES.login);
        return;
      case API_ERROR.NOT_FOUND:
        // 条目已被他端删除等场景：按当前读域静默重取（写后失效编排）
        void resync();
        return;
      case API_ERROR.SAVE_FAILED:
      case API_ERROR.LOAD_FAILED:
        // 写端点不产出读兜底码，穷尽分支与保存失败同呈现
        setFormError(true);
        return;
    }
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

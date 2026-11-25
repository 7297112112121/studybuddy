"use client";

/**
 * 条目新建/编辑表单（AXY-22 design「UI 与组件」节）。
 *
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/common/routes";

import type { CalendarEntryView } from "@/modules/calendar/queries";
import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "@/validation/calendar-validators";
import { API_ERROR, toFieldErrors, type ApiResult } from "@/common/error";
import { useCalendarStore } from "@/stores/calendar";

type EntryFormProps = {
  /** 所选日期（新建模式提交日期；编辑模式被日期控件初值覆盖）。 */
  date: string;
  /** 在场即编辑模式，预填原值。 */
  entry?: CalendarEntryView;
  /** 保存成功回调（父组件据此切换视图/刷新）。 */
  onSaved?: () => void;
  /** 是否渲染所属日期控件(AXY-23:周视图编辑卡传 false,日期锁定所在列)。 */
  showDateField?: boolean;
  /** create 模式开始时间初值(AXY-23:周视图点击槽预填,F-05)。 */
  initialStartTime?: string;
};

export default function EntryForm({
  date,
  entry,
  onSaved,
  showDateField = true,
  initialStartTime = "",
}: EntryFormProps) {
  const t = useTranslations("calendar");
  const tRoot = useTranslations();
  const router = useRouter();
  const createEntry = useCalendarStore((s) => s.createEntry);
  const updateEntry = useCalendarStore((s) => s.updateEntry);
  const resync = useCalendarStore((s) => s.resync);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [startTime, setStartTime] = useState(
    entry?.startTime ?? initialStartTime,
  );
  const [endTime, setEndTime] = useState(entry?.endTime ?? "");
  const [entryDate, setEntryDate] = useState(entry?.date ?? date);
  const [fieldErrors, setFieldErrors] = useState<CalendarFieldErrors>({});
  const [formError, setFormError] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const editing = entry !== undefined;

  /** 对应字段修正后错误即时消除（design「表单与交互状态」节）。 */
  function clearFieldError(field: keyof CalendarFieldErrors): void {
    setFieldErrors((prev) =>
      prev[field] === undefined ? prev : { ...prev, [field]: undefined },
    );
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>): void {
    setTitle(e.target.value);
    clearFieldError("title");
  }
  function handleContentChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setContent(e.target.value);
    clearFieldError("content");
  }
  function handleStartTimeChange(e: ChangeEvent<HTMLInputElement>): void {
    setStartTime(e.target.value);
    clearFieldError("startTime");
  }
  function handleEndTimeChange(e: ChangeEvent<HTMLInputElement>): void {
    setEndTime(e.target.value);
    clearFieldError("endTime");
  }
  function handleDateChange(e: ChangeEvent<HTMLInputElement>): void {
    setEntryDate(e.target.value);
    clearFieldError("date");
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (isPending) return;

    const payload: CalendarEntryInput = {
      date: editing ? entryDate : date,
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
    // 网络/服务异常：fetch reject 与服务端保存失败（SAVE_FAILED）同归一为
    // 表单提示区文案，不向 React 边界抛未捕获异常
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
      onSaved?.();
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
        // 条目已被他端删除等场景：按当前读域静默重取(写后失效编排)
        void resync();
        return;
      case API_ERROR.SAVE_FAILED:
      case API_ERROR.LOAD_FAILED:
        // 写端点不产出读兜底码(LOAD_FAILED),穷尽分支与保存失败同呈现
        setFormError(true);
        return;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calendar-entry-title">{t("form.titleLabel")}</Label>
        <Input
          id="calendar-entry-title"
          value={title}
          maxLength={50}
          onChange={handleTitleChange}
        />
        {fieldErrors.title && (
          <p className="text-destructive text-sm">{tRoot(fieldErrors.title)}</p>
        )}
      </div>

      {/* 具体内容:纯文本记录,不做格式化;可空 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calendar-entry-content">{t("form.contentLabel")}</Label>
        <Textarea
          id="calendar-entry-content"
          value={content}
          maxLength={2000}
          onChange={handleContentChange}
        />
        {fieldErrors.content && (
          <p className="text-destructive text-sm">
            {tRoot(fieldErrors.content)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-entry-start">
              {t("form.startTimeLabel")}
            </Label>
            <Input
              id="calendar-entry-start"
              type="time"
              step={60}
              value={startTime}
              onChange={handleStartTimeChange}
            />
            {fieldErrors.startTime && (
              <p className="text-destructive text-sm">
                {tRoot(fieldErrors.startTime)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-entry-end">{t("form.endTimeLabel")}</Label>
            <Input
              id="calendar-entry-end"
              type="time"
              step={60}
              value={endTime}
              disabled={startTime === ""}
              onChange={handleEndTimeChange}
            />
            {fieldErrors.endTime && (
              <p className="text-destructive text-sm">
                {tRoot(fieldErrors.endTime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && showDateField && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendar-entry-date">{t("form.dateLabel")}</Label>
          <Input
            id="calendar-entry-date"
            type="date"
            value={entryDate}
            onChange={handleDateChange}
          />
          {fieldErrors.date && (
            <p className="text-destructive text-sm">
              {tRoot(fieldErrors.date)}
            </p>
          )}
        </div>
      )}

      {formError && (
        <p role="alert" className="text-destructive text-sm">
          {t("error.saveFailed")}
        </p>
      )}

      {/* 纯色品牌主按钮(全局主题内 primary 即 aurora-aqua),
          外发光沿用 auth SubmitButton 手法;不用渐变(设计裁决:渐变不作按钮) */}
      <Button
        type="submit"
        disabled={isPending}
        className="shadow-lg shadow-aurora-aqua/30"
      >
        {editing ? t("form.saveButton") : t("form.addButton")}
      </Button>
    </form>
  );
}

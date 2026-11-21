"use client";

/**
 * 条目新建/编辑表单（AXY-22 design「UI 与组件」节）。
 *
 * 校验单一来源：客户端与服务端共用 calendarEntryInputSchema（safeParse
 * 即地呈现，失败不调 action）；zod message 为 i18n key，经根作用域
 * useTranslations() 渲染（键含命名空间前缀）。编辑模式（entry 在场）
 * 预填原值并展示所属日期控件（R11 改期入口）；新建模式日期由选中天决定。
 *
 * 展示态：E-01 在事项字段下方、E-03 在结束时间字段下方、E-02 在表单
 * 提示区；修正后即时消除（对应字段 change 时清错）；提交中按钮置灰
 * 不可重复提交（R12）；UNAUTHORIZED → /login、NOT_FOUND → 静默刷新。
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";

import type { CalendarEntryView } from "../queries";
import {
  calendarEntryInputSchema,
  type CalendarEntryInput,
  type CalendarFieldErrors,
} from "../validators";
import {
  createEntryAction,
  updateEntryAction,
  type CalendarEntryActionResult,
} from "../actions";

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

  const [title, setTitle] = useState(entry?.title ?? "");
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
      startTime: startTime === "" ? null : startTime,
      endTime: endTime === "" ? null : endTime,
    };
    const parsed = calendarEntryInputSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: CalendarFieldErrors = {};
      for (const issue of parsed.error.issues as z.core.$ZodIssue[]) {
        const field = issue.path[0];
        if (
          !errors[field as keyof CalendarFieldErrors] &&
          (field === "date" ||
            field === "title" ||
            field === "startTime" ||
            field === "endTime")
        ) {
          errors[field as keyof CalendarFieldErrors] = issue.message;
        }
      }
      setFieldErrors(errors);
      setFormError(false);
      return;
    }

    setFieldErrors({});
    setFormError(false);
    setIsPending(true);
    // E-02（网络/服务异常）：action 传输层失败（fetch reject）与服务端
    // SAVE_FAILED 同归一为表单提示区文案，不向 React 边界抛未捕获异常
    let result: CalendarEntryActionResult;
    try {
      result = editing
        ? await updateEntryAction(entry.id, parsed.data)
        : await createEntryAction(parsed.data);
    } catch {
      setIsPending(false);
      setFormError(true);
      return;
    }
    setIsPending(false);

    if (result.ok) {
      setTitle("");
      setStartTime("");
      setEndTime("");
      onSaved?.();
      return;
    }
    switch (result.error) {
      case "INVALID_INPUT":
        setFieldErrors(result.fieldErrors);
        return;
      case "UNAUTHORIZED":
        router.replace(ROUTES.login);
        return;
      case "NOT_FOUND":
        router.refresh();
        return;
      case "SAVE_FAILED":
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

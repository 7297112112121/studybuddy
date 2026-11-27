"use client";

/**
 * 条目表单组合层：接表单状态机（useEntryForm，字段态/校验/保存链全部在
 * hook），排版字段与错误呈现；WeekEntryDialog 唯一挂载点。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { useEntryForm } from "../useEntryForm";
import EntryFieldRow from "./EntryFieldRow";

type EntryFormProps = {
  /** 所选日期（新建模式提交日期；编辑模式被日期控件初值覆盖）。 */
  date: string;
  /** 在场即编辑模式，预填原值。 */
  entry?: CalendarEntryView;
  /** 保存成功回调（父组件据此切换视图/刷新）。 */
  onSaved?: () => void;
  /** 是否渲染所属日期控件（周视图编辑卡传 false，日期锁定所在列）。 */
  showDateField?: boolean;
  /** 新建模式开始时间初值（周视图点击槽预填槽起点）。 */
  initialStartTime?: string;
  /** 新建模式结束时间初值（周视图点击槽预填起点 + 默认 1 小时）。 */
  initialEndTime?: string;
};

export default function EntryForm({
  date,
  entry,
  onSaved,
  showDateField = true,
  initialStartTime = "",
  initialEndTime = "",
}: EntryFormProps) {
  const t = useTranslations("calendar");
  const form = useEntryForm({
    date,
    entry,
    onSaved,
    initialStartTime,
    initialEndTime,
  });

  return (
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <EntryFieldRow
        id="calendar-entry-title"
        label={t("form.titleLabel")}
        error={form.fieldErrors.title}
      >
        <Input
          id="calendar-entry-title"
          value={form.title}
          maxLength={50}
          onChange={form.onTitleChange}
        />
      </EntryFieldRow>

      {/* 具体内容：纯文本记录，不做格式化；可空 */}
      <EntryFieldRow
        id="calendar-entry-content"
        label={t("form.contentLabel")}
        error={form.fieldErrors.content}
      >
        <Textarea
          id="calendar-entry-content"
          value={form.content}
          maxLength={2000}
          onChange={form.onContentChange}
        />
      </EntryFieldRow>

      <div className="grid grid-cols-2 gap-3">
        <EntryFieldRow
          id="calendar-entry-start"
          label={t("form.startTimeLabel")}
          error={form.fieldErrors.startTime}
        >
          <Input
            id="calendar-entry-start"
            type="time"
            step={60}
            value={form.startTime}
            onChange={form.onStartTimeChange}
          />
        </EntryFieldRow>
        <EntryFieldRow
          id="calendar-entry-end"
          label={t("form.endTimeLabel")}
          error={form.fieldErrors.endTime}
        >
          <Input
            id="calendar-entry-end"
            type="time"
            step={60}
            value={form.endTime}
            disabled={form.startTime === ""}
            onChange={form.onEndTimeChange}
          />
        </EntryFieldRow>
      </div>

      {form.editing && showDateField && (
        <EntryFieldRow
          id="calendar-entry-date"
          label={t("form.dateLabel")}
          error={form.fieldErrors.date}
        >
          <Input
            id="calendar-entry-date"
            type="date"
            value={form.entryDate}
            onChange={form.onDateChange}
          />
        </EntryFieldRow>
      )}

      {form.formError && (
        <p role="alert" className="text-destructive text-sm">
          {t("error.saveFailed")}
        </p>
      )}

      {/* 纯色品牌主按钮（全局主题内 primary 即 aurora-aqua），
          外发光沿用 auth SubmitButton 手法；不用渐变（设计裁决：渐变不作按钮） */}
      <Button
        type="submit"
        disabled={form.isPending}
        className="shadow-lg shadow-aurora-aqua/30"
      >
        {form.editing ? t("form.saveButton") : t("form.addButton")}
      </Button>
    </form>
  );
}

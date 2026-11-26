"use client";

/**
 * 条目表单组合层：接表单状态机（useEntryForm，字段态/校验/保存链全部在
 * hook），排版字段与错误呈现；DayPanel 与 WeekEntryDialog 双挂载点共用。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { useEntryForm } from "../useEntryForm";

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
  const form = useEntryForm({ date, entry, onSaved, initialStartTime });

  return (
    <form
      onSubmit={form.handleSubmit}
      noValidate
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calendar-entry-title">{t("form.titleLabel")}</Label>
        <Input
          id="calendar-entry-title"
          value={form.title}
          maxLength={50}
          onChange={form.onTitleChange}
        />
        {form.fieldErrors.title && (
          <p className="text-destructive text-sm">
            {tRoot(form.fieldErrors.title)}
          </p>
        )}
      </div>

      {/* 具体内容：纯文本记录，不做格式化；可空 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calendar-entry-content">{t("form.contentLabel")}</Label>
        <Textarea
          id="calendar-entry-content"
          value={form.content}
          maxLength={2000}
          onChange={form.onContentChange}
        />
        {form.fieldErrors.content && (
          <p className="text-destructive text-sm">
            {tRoot(form.fieldErrors.content)}
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
              value={form.startTime}
              onChange={form.onStartTimeChange}
            />
            {form.fieldErrors.startTime && (
              <p className="text-destructive text-sm">
                {tRoot(form.fieldErrors.startTime)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-entry-end">{t("form.endTimeLabel")}</Label>
            <Input
              id="calendar-entry-end"
              type="time"
              step={60}
              value={form.endTime}
              disabled={form.startTime === ""}
              onChange={form.onEndTimeChange}
            />
            {form.fieldErrors.endTime && (
              <p className="text-destructive text-sm">
                {tRoot(form.fieldErrors.endTime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {form.editing && showDateField && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendar-entry-date">{t("form.dateLabel")}</Label>
          <Input
            id="calendar-entry-date"
            type="date"
            value={form.entryDate}
            onChange={form.onDateChange}
          />
          {form.fieldErrors.date && (
            <p className="text-destructive text-sm">
              {tRoot(form.fieldErrors.date)}
            </p>
          )}
        </div>
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

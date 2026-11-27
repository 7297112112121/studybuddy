"use client";

/**
 * 条目行组合层：行文案与操作按钮接线；删除走共享删除确认状态机
 * （useEntryDelete），确认层无额外输入。
 */
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import type { CalendarEntryView } from "@/modules/calendar/queries";

import { timePrefix } from "../dates";
import { useEntryDelete } from "../useEntryDelete";
import EntryDeleteConfirm from "./EntryDeleteConfirm";

type EntryRowProps = {
  entry: CalendarEntryView;
  /** 传入时替代时间前缀展示于行首（右栏未安排卡显示周几）。 */
  leadingText?: string;
  onEdit: () => void;
};

export default function EntryRow({
  entry,
  leadingText,
  onEdit,
}: EntryRowProps) {
  const t = useTranslations("calendar");
  const { confirmOpen, openConfirm, closeConfirm, isDeleting, confirmDelete } =
    useEntryDelete();

  const time = leadingText ?? timePrefix(entry);

  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="w-24 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">
        {time}
      </span>
      {/* 时间轨：竖线贯通行高，节点对齐行首——无时间条目留空时间格，
          但仍占轨上节点（条目在场即有事项，与时间无关） */}
      <span aria-hidden="true" className="relative w-3 shrink-0 self-stretch">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        <span className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{entry.title}</span>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              {t("entry.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={openConfirm}
            >
              {t("entry.delete")}
            </Button>
            <EntryDeleteConfirm
              open={confirmOpen}
              title={entry.title}
              onCancel={closeConfirm}
              onConfirm={() => confirmDelete(entry.id)}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

"use client";

/** 周视图单日列（纯展示）：48 个点击槽（时间预填槽起点）与重叠并列均分的色块。 */
import { useTranslations } from "next-intl";

import type { CalendarEntryView } from "@/app/api/calendar/response";

import {
  PX_PER_MINUTE,
  SLOT_MINUTES,
  SLOTS_PER_DAY,
  layoutDayBlocks,
  minutesToHhmm,
  timePrefix,
  type WeekDay,
} from "../utils";

type WeekDayColumnProps = {
  day: WeekDay;
  entries: CalendarEntryView[];
  onCreate: (date: string, slotMinutes: number) => void;
  onEdit: (entry: CalendarEntryView) => void;
};

export default function WeekDayColumn({
  day,
  entries,
  onCreate,
  onEdit,
}: WeekDayColumnProps) {
  const t = useTranslations("calendar");
  const blocks = layoutDayBlocks(
    entries.filter((entry) => entry.startTime !== null),
  );
  return (
    <div className="relative border-l border-border/60">
      {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
        <button
          key={slot}
          type="button"
          aria-label={t("week.createAt", {
            weekday: t(`weekday.${day.weekdayKey}`),
            time: minutesToHhmm(slot * SLOT_MINUTES),
          })}
          onClick={() => onCreate(day.date, slot * SLOT_MINUTES)}
          className="absolute left-0 right-0 border-b border-border/30 hover:bg-accent/40"
          style={{
            top: slot * SLOT_MINUTES * PX_PER_MINUTE,
            height: SLOT_MINUTES * PX_PER_MINUTE,
          }}
        />
      ))}
      {/* 色块：重叠簇并列均分，点击编辑 */}
      {blocks.map((block) => {
        const entryData = entries.find((entry) => entry.id === block.entryId);
        if (entryData === undefined) return null;
        return (
          <button
            key={block.entryId}
            type="button"
            data-testid={`week-block-${block.entryId}`}
            onClick={() => onEdit(entryData)}
            className="absolute z-10 flex flex-col overflow-hidden rounded-lg border-l-2 border-primary bg-primary/15 px-1.5 text-left ring-1 ring-primary/40 hover:bg-primary/25 hover:ring-primary/60"
            style={{
              top: block.startMinutes * PX_PER_MINUTE,
              height: block.durationMinutes * PX_PER_MINUTE,
              left: `${block.leftPercent}%`,
              width: `${block.widthPercent}%`,
            }}
          >
            <span className="text-[11px] tabular-nums text-primary">
              {timePrefix(entryData)}
            </span>
            <span className="truncate text-xs font-medium">
              {entryData.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

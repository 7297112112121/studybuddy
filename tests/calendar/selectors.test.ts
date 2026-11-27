/**
 * 日历域读域派生 selector 单测：今日日程过滤（今天 + 有开始时间）、
 * 未安排过滤（无开始时间）与两卡互斥语义（交集恒空）。
 */
import { describe, expect, it } from "vitest";

import type { CalendarEntryView } from "@/modules/calendar/queries";
import {
  selectTodaysSchedule,
  selectWeekUnscheduled,
} from "@/features/calendar/utils";

const TODAY = "2026-11-18";

function entry(overrides: Partial<CalendarEntryView>): CalendarEntryView {
  return {
    id: "e1",
    date: TODAY,
    title: "事项",
    content: null,
    startTime: null,
    endTime: null,
    ...overrides,
  };
}

describe("selectTodaysSchedule", () => {
  it("只收今天当天已安排时间的条目", () => {
    const entries = [
      entry({ id: "a", startTime: "09:00" }),
      entry({ id: "b", date: "2026-11-19", startTime: "10:00" }),
      entry({ id: "c", startTime: null }),
    ];
    expect(selectTodaysSchedule(entries, TODAY).map((e) => e.id)).toEqual([
      "a",
    ]);
  });
});

describe("selectWeekUnscheduled", () => {
  it("只收无开始时间的条目，跨日全收", () => {
    const entries = [
      entry({ id: "a", startTime: "09:00" }),
      entry({ id: "c", startTime: null }),
      entry({ id: "d", date: "2026-11-19", startTime: null }),
    ];
    expect(selectWeekUnscheduled(entries).map((e) => e.id)).toEqual(["c", "d"]);
  });
});

describe("两卡互斥", () => {
  it("今日已安排与未安排交集恒空", () => {
    const entries = [
      entry({ id: "a", startTime: "09:00" }),
      entry({ id: "c", startTime: null }),
    ];
    const scheduled = selectTodaysSchedule(entries, TODAY);
    const unscheduled = selectWeekUnscheduled(entries);
    const scheduledIds = new Set(scheduled.map((e) => e.id));
    expect(unscheduled.filter((e) => scheduledIds.has(e.id))).toEqual([]);
  });
});

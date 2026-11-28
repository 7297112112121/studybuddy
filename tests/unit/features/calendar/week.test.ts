import { describe, expect, it } from "vitest";
import {
  addWeeks,
  buildWeekDays,
  weekStartFor,
} from "@/features/calendar/utils";
import { isValidWeekStart } from "@/validation/calendar";
import { weekRange } from "@/services/calendar/queries";

/**
 * calendar 周视图纯函数单测(AXY-23 design「契约」节)。
 * 断言值逐字取自 tasks.md Task 1「失败测试」行。
 */
describe("weekStartFor:任意日期 → 所在周周一", () => {
  it("周中日期 2026-11-18(周三) → '2026-11-16'", () => {
    expect(weekStartFor("2026-11-18")).toBe("2026-11-16");
  });

  it("周一输入恒等:'2026-11-16' → '2026-11-16'", () => {
    expect(weekStartFor("2026-11-16")).toBe("2026-11-16");
  });

  it("周日 '2026-11-22' → 该周周一 '2026-11-16'", () => {
    expect(weekStartFor("2026-11-22")).toBe("2026-11-16");
  });

  it("跨年周:'2026-01-01'(周四) → '2025-12-29'", () => {
    expect(weekStartFor("2026-01-01")).toBe("2025-12-29");
  });
});

describe("buildWeekDays:周一锚点 → 周内 7 天", () => {
  const days = buildWeekDays("2026-11-16", "2026-11-18");

  it("恰 7 项", () => {
    expect(days).toHaveLength(7);
  });

  it("列序周一首:dates 2026-11-16..22,weekdayKey mon..sun", () => {
    expect(days.map((d) => d.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    expect(days.map((d) => d.weekdayKey)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
  });

  it("isToday 唯一命中 today='2026-11-18'", () => {
    const todayCells = days.filter((d) => d.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]?.date).toBe("2026-11-18");
  });

  it("today 不在本周时全部 isToday=false", () => {
    expect(
      buildWeekDays("2026-11-16", "2026-11-30").every((d) => !d.isToday),
    ).toBe(true);
  });
});

describe("weekRange:周一锚点 → 周闭区间", () => {
  it("'2026-11-16' → { start: '2026-11-16', end: '2026-11-22' }", () => {
    expect(weekRange("2026-11-16")).toEqual({
      start: "2026-11-16",
      end: "2026-11-22",
    });
  });

  it("跨月周:'2026-11-30' → { start: '2026-11-30', end: '2026-12-06' }", () => {
    expect(weekRange("2026-11-30")).toEqual({
      start: "2026-11-30",
      end: "2026-12-06",
    });
  });
});

describe("addWeeks:周一锚点 ± delta 周", () => {
  it("±1 周:'2026-11-16' → '2026-11-23' / '2026-11-09'", () => {
    expect(addWeeks("2026-11-16", 1)).toBe("2026-11-23");
    expect(addWeeks("2026-11-16", -1)).toBe("2026-11-09");
  });

  it("delta 0 恒等", () => {
    expect(addWeeks("2026-11-16", 0)).toBe("2026-11-16");
  });

  it("跨月跨年:addWeeks('2026-11-30', 1) → '2026-12-07'", () => {
    expect(addWeeks("2026-11-30", 1)).toBe("2026-12-07");
  });
});

describe("isValidWeekStart:合法日期且确为周一", () => {
  it("接受周一 '2026-11-16'", () => {
    expect(isValidWeekStart("2026-11-16")).toBe(true);
  });

  it("拒收非周一 '2026-11-18'(周三)", () => {
    expect(isValidWeekStart("2026-11-18")).toBe(false);
  });

  it("拒收不存在的日历日 '2026-02-30'", () => {
    expect(isValidWeekStart("2026-02-30")).toBe(false);
  });

  it("拒收乱格式 'abc' 与 '20261116'", () => {
    expect(isValidWeekStart("abc")).toBe(false);
    expect(isValidWeekStart("20261116")).toBe(false);
  });
});

// —— Task 2:网格几何纯函数(tasks.md Task 2「失败测试」行) ——

import {
  layoutDayBlocks,
  slotPrefillEnd,
  slotPrefillStart,
  timeToMinutes,
  type WeekBlock,
} from "@/features/calendar/utils";
import type { CalendarEntryView } from "@/app/api/calendar/response";

/** 构造带时间条目视图(startTime 恒非 null,全天条目不进 layoutDayBlocks)。 */
function entry(
  id: string,
  start: string,
  end: string | null,
): CalendarEntryView {
  return {
    id,
    date: "2026-11-18",
    title: `条目${id}`,
    content: null,
    startTime: start,
    endTime: end,
  };
}

describe("timeToMinutes:HH:MM → 当日分钟数", () => {
  it("'14:30' → 870; '00:00' → 0; '23:59' → 1439", () => {
    expect(timeToMinutes("14:30")).toBe(870);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("非法输入抛 RangeError:'24:00' / '7:30'", () => {
    expect(() => timeToMinutes("24:00")).toThrow(RangeError);
    expect(() => timeToMinutes("7:30")).toThrow(RangeError);
  });
});

describe("slotPrefillStart:点击分钟 → 30 分钟槽起点(F-05 向下取整)", () => {
  it("14:20(860 分) → '14:00'; 14:30(870 分) → '14:30'; 23:59 → '23:30'", () => {
    expect(slotPrefillStart(timeToMinutes("14:20"))).toBe("14:00");
    expect(slotPrefillStart(timeToMinutes("14:30"))).toBe("14:30");
    expect(slotPrefillStart(1439)).toBe("23:30");
  });

  it("整点恒等:07:00(420 分) → '07:00'", () => {
    expect(slotPrefillStart(420)).toBe("07:00");
  });
});

describe("slotPrefillEnd:槽起点 + 默认 1 小时的预填终点", () => {
  it("14:20 → '15:00'; 14:30 → '15:30'; 22:30 → '23:30'", () => {
    expect(slotPrefillEnd(timeToMinutes("14:20"))).toBe("15:00");
    expect(slotPrefillEnd(timeToMinutes("14:30"))).toBe("15:30");
    expect(slotPrefillEnd(timeToMinutes("22:30"))).toBe("23:30");
  });

  it("跨过 24:00 的槽 → 空串(回退有起点无终点形态)", () => {
    expect(slotPrefillEnd(timeToMinutes("23:00"))).toBe("");
    expect(slotPrefillEnd(1439)).toBe("");
  });
});

describe("layoutDayBlocks:重叠簇并列均分(proposal 边界 #2 / D-12)", () => {
  it("时间点条目(仅开始时间)durationMinutes=30,块携带原条目引用", () => {
    const source = entry("a", "10:00", null);
    const blocks = layoutDayBlocks([source]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      entryId: "a",
      startMinutes: 600,
      durationMinutes: 30,
      leftPercent: 0,
      widthPercent: 100,
    });
    expect(blocks[0]?.entry).toBe(source);
  });

  it("无重叠两块各满列宽", () => {
    const blocks = layoutDayBlocks([
      entry("a", "09:00", "10:00"),
      entry("b", "14:00", "15:00"),
    ]);
    for (const b of blocks) {
      expect(b.leftPercent).toBe(0);
      expect(b.widthPercent).toBe(100);
    }
    expect(blocks[0]?.durationMinutes).toBe(60);
  });

  it("两块重叠 → 簇内均分:leftPercent 0/50,widthPercent 各 50", () => {
    const blocks = layoutDayBlocks([
      entry("a", "14:00", "15:30"),
      entry("b", "14:30", "15:00"),
    ]);
    const sorted = [...blocks].sort((x, y) => x.leftPercent - y.leftPercent);
    expect(sorted[0]).toMatchObject({
      entryId: "a",
      leftPercent: 0,
      widthPercent: 50,
    });
    expect(sorted[1]).toMatchObject({
      entryId: "b",
      leftPercent: 50,
      widthPercent: 50,
    });
  });

  it("三块互叠 → 各 1/3;与不重叠块互不影响", () => {
    const blocks = layoutDayBlocks([
      entry("a", "09:00", "10:00"),
      entry("x", "14:00", "16:00"),
      entry("y", "14:30", "15:30"),
      entry("z", "15:00", "17:00"),
    ]);
    const full = blocks.find((b) => b.entryId === "a");
    expect(full?.widthPercent).toBe(100);
    const cluster = blocks.filter((b) => b.entryId !== "a");
    expect(cluster).toHaveLength(3);
    for (const b of cluster) {
      expect(b.widthPercent).toBeCloseTo(100 / 3, 5);
    }
    const totalLeft = cluster.map((b) => b.leftPercent).sort((p, q) => p - q);
    expect(totalLeft[0]).toBe(0);
  });

  it("入参顺序无关:同一集合不同顺序产出相同布局", () => {
    const a = layoutDayBlocks([
      entry("a", "14:00", "15:30"),
      entry("b", "14:30", "15:00"),
    ]);
    const b = layoutDayBlocks([
      entry("b", "14:30", "15:00"),
      entry("a", "14:00", "15:30"),
    ]);
    const byId = (list: WeekBlock[]) =>
      Object.fromEntries(
        list.map((x) => [x.entryId, [x.leftPercent, x.widthPercent]]),
      );
    expect(byId(a)).toEqual(byId(b));
  });
});

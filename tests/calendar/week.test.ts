import { describe, expect, it } from "vitest";
import {
  addWeeks,
  buildWeekDays,
  isValidWeekStart,
  weekRange,
  weekStartFor,
} from "@/modules/calendar/week";

/**
 * calendar/week.ts 周数学纯函数单测(AXY-23 design「契约」节)。
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
    expect(buildWeekDays("2026-11-16", "2026-11-30").every((d) => !d.isToday)).toBe(
      true,
    );
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

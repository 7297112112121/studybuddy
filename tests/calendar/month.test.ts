import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "@/features/calendar/useClientScreen";
import { addMonths } from "@/features/calendar/useClientScreen";
import { isValidDateString } from "@/validation/calendar-validators";
import { formatHhmm, monthRange } from "@/modules/calendar/queries";

/**
 * calendar 月视图纯函数单测（AXY-22 design「契约」节）。
 * 断言值逐字取自 tasks.md Task 1「失败测试」行。
 */
describe("buildMonthGrid：6×7 月网格，周一为每周首日", () => {
  it("2026-11 → 恰 42 格，首格为 2026-10-26（周一）", () => {
    const cells = buildMonthGrid(2026, 11, "2026-11-17");
    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe("2026-10-26");
  });

  it("2026-11 → 邻月补位格 inMonth=false，本月日期 inMonth=true", () => {
    const cells = buildMonthGrid(2026, 11, "2026-11-17");
    expect(cells[0].inMonth).toBe(false); // 2026-10-26 属 10 月
    const oct31 = cells.find((c) => c.date === "2026-10-31");
    expect(oct31?.inMonth).toBe(false); // 补位格止于 10-31（11-01 虽居首周但属 11 月）
    const nov1 = cells.find((c) => c.date === "2026-11-01");
    expect(nov1?.inMonth).toBe(true);
    const nov30 = cells.find((c) => c.date === "2026-11-30");
    expect(nov30?.inMonth).toBe(true);
  });

  it("今日标识：today='2026-11-17' 时该格 isToday=true 且全网格唯一", () => {
    const cells = buildMonthGrid(2026, 11, "2026-11-17");
    const todayCells = cells.filter((c) => c.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].date).toBe("2026-11-17");
  });
});

describe("monthRange：该月日期闭区间", () => {
  it("2026-11 → { start: '2026-11-01', end: '2026-11-30' }", () => {
    expect(monthRange(2026, 11)).toEqual({
      start: "2026-11-01",
      end: "2026-11-30",
    });
  });

  it("闰月 2028-02 → end 为 '2028-02-29'", () => {
    expect(monthRange(2028, 2).end).toBe("2028-02-29");
  });
});

describe("addMonths：month 1–12 自动进退位", () => {
  it("(2026, 1, -1) → { year: 2025, month: 12 }", () => {
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("(2026, 12, 1) → { year: 2027, month: 1 }", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});

describe("isValidDateString：格式合法且为真实日历日", () => {
  it("接受 '2026-11-17'", () => {
    expect(isValidDateString("2026-11-17")).toBe(true);
  });

  it("拒收不存在的日历日 '2026-02-30'", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
  });

  it("拒收非法月份 '2026-13-01'", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
  });

  it("拒收无连字符格式 '20261117'", () => {
    expect(isValidDateString("20261117")).toBe(false);
  });

  it("拒收短格式 '2026-11-1'", () => {
    expect(isValidDateString("2026-11-1")).toBe(false);
  });
});

describe("formatHhmm：time 列查询结果归一", () => {
  it("'14:00:00' → '14:00'", () => {
    expect(formatHhmm("14:00:00")).toBe("14:00");
  });
});

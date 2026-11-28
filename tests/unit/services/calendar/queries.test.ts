import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEntryView } from "@/app/api/calendar/response";
import { db } from "@/common/db";
import { calendarEntry } from "@/db/schema";

import { listMonthEntries, listWeekEntries } from "@/services/calendar/queries";

/**
 * calendar 读路径查询单测（归属单测轨）：桩接相邻层 @/common/db 后，
 * 只证行的时间归一（"HH:MM"）、同日排序与 select 投影形状；区间过滤
 * 语义归 SQL，由接口轨真依赖直调承接。
 * 幸存变异体口径：排序比较器在 V8（n<64 仅按 <0 分支）下的 0↔1 返回值
 * 差异不可观测，已论证等价，不为杀变异体造数。
 */
vi.mock("@/common/db", () => ({
  db: { select: vi.fn() },
}));

const selectMock = vi.mocked(db.select);

/** 桩定查询链：SQL 侧恒返回给定行序，过滤与排序语义由被测物承接。 */
function stubRows(rows: CalendarEntryView[]): void {
  selectMock.mockReturnValue({
    from: () => ({ where: () => Promise.resolve(rows) }),
  } as unknown as ReturnType<typeof db.select>);
}

/** 造数：条目视图行，字段全显式，期望断言逐字对照。 */
function entry(
  id: string,
  date: string,
  startTime: string | null,
  endTime: string | null,
): CalendarEntryView {
  return { id, date, title: `条目${id}`, content: null, startTime, endTime };
}

beforeEach(() => {
  selectMock.mockReset();
});

describe("listMonthEntries：select 投影形状（响应契约六列来源）", () => {
  it("投影恰六列且各列锚定 calendarEntry 同名字段", async () => {
    stubRows([]);

    await listMonthEntries("user-1", 2026, 12);

    const projection = selectMock.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(projection).sort()).toEqual([
      "content",
      "date",
      "endTime",
      "id",
      "startTime",
      "title",
    ]);
    expect(projection.id).toBe(calendarEntry.id);
    expect(projection.date).toBe(calendarEntry.entryDate);
    expect(projection.title).toBe(calendarEntry.title);
    expect(projection.content).toBe(calendarEntry.content);
    expect(projection.startTime).toBe(calendarEntry.startTime);
    expect(projection.endTime).toBe(calendarEntry.endTime);
  });
});

describe("listMonthEntries：查询行按日期升序输出", () => {
  it.each([
    ["2026-12-24", "2026-12-02"],
    ["2026-12-02", "2026-12-24"],
  ])("桩行输入顺序 %s → 输出按日期升序", async (first, second) => {
    stubRows([entry("a", first, null, null), entry("b", second, null, null)]);
    const entries = await listMonthEntries("user-1", 2026, 12);
    expect(entries.map((e) => e.date)).toEqual(["2026-12-02", "2026-12-24"]);
  });
});

describe("listWeekEntries：同日条目排序矩阵（周锚 2026-11-16 周一）", () => {
  it.each([
    ["14:30", "09:00"],
    ["09:00", "14:30"],
  ])("桩行同日输入时间序 %s → 输出按开始时间升序", async (first, second) => {
    stubRows([
      entry("a", "2026-11-17", first, null),
      entry("b", "2026-11-17", second, "10:00:00"),
    ]);
    const entries = await listWeekEntries("user-1", "2026-11-16");
    expect(entries.map((e) => e.startTime)).toEqual(["09:00", "14:30"]);
  });

  it("桩行同日开始时间相等 → 保持输入顺序", async () => {
    stubRows([
      entry("a", "2026-11-17", "10:00", null),
      entry("b", "2026-11-17", "10:00", null),
    ]);
    const entries = await listWeekEntries("user-1", "2026-11-16");
    expect(entries.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it.each([
    [null, "09:05"],
    ["09:05", null],
  ])(
    "桩行同日一null一时间、输入序 %s → 输出无时间行在前",
    async (first, second) => {
      stubRows([
        entry("a", "2026-11-17", first, null),
        entry("b", "2026-11-17", second, null),
      ]);
      const entries = await listWeekEntries("user-1", "2026-11-16");
      expect(entries.map((e) => e.startTime)).toEqual([null, "09:05"]);
    },
  );

  it("桩行同日均无时间 → 保持输入顺序", async () => {
    stubRows([
      entry("a", "2026-11-17", null, null),
      entry("b", "2026-11-17", null, null),
    ]);
    const entries = await listWeekEntries("user-1", "2026-11-16");
    expect(entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("listWeekEntries：时间列归一", () => {
  it("桩行带秒与 null 混排 → 带秒截短为 HH:MM、null 保持 null", async () => {
    stubRows([
      entry("a", "2026-11-17", "09:05:00", null),
      entry("b", "2026-11-18", null, "21:30:00"),
    ]);
    const entries = await listWeekEntries("user-1", "2026-11-16");
    expect(entries).toEqual([
      {
        id: "a",
        date: "2026-11-17",
        title: "条目a",
        content: null,
        startTime: "09:05",
        endTime: null,
      },
      {
        id: "b",
        date: "2026-11-18",
        title: "条目b",
        content: null,
        startTime: null,
        endTime: "21:30",
      },
    ]);
  });
});

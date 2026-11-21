import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { calendarEntry } from "@/modules/calendar/schema";
import {
  TIME_HHMM_RE,
  calendarEntryInputSchema,
} from "@/modules/calendar/validators";

/**
 * calendar 表定义与条目入参契约单测（AXY-22 design「数据模型」「契约」节）。
 * 表定义在 schema.ts,zod 契约在 validators.ts(校验单一真源)。
 * 断言值逐字取自 tasks.md Task 2「失败测试」行。
 */

/** 取 safeParse 失败 issues 的快捷断言（zod message 即 i18n key）。 */
function issuesOf(input: unknown) {
  const result = calendarEntryInputSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues;
}

function hasIssue(
  issues: { path: PropertyKey[]; message: string }[],
  field: string,
  message: string,
): boolean {
  return issues.some((i) => i.path.includes(field) && i.message === message);
}

/** 合法基线入参（不带时间形态）。 */
const validBase = {
  date: "2026-11-17",
  title: "高数复习",
  startTime: null,
  endTime: null,
} as const;

describe("calendarEntry 表定义", () => {
  const config = getTableConfig(calendarEntry);

  it("表名为 calendar_entry，列集恰为 8 列（snake_case 烘焙）", () => {
    expect(config.name).toBe("calendar_entry");
    const names = config.columns.map((c) => c.name).sort();
    expect(names).toEqual([
      "created_at",
      "end_time",
      "entry_date",
      "id",
      "start_time",
      "title",
      "updated_at",
      "user_id",
    ]);
  });

  it("可空性：userId/entryDate/title/createdAt/updatedAt notNull，startTime/endTime 可空", () => {
    const byName = Object.fromEntries(config.columns.map((c) => [c.name, c]));
    for (const col of ["id", "user_id", "entry_date", "title"]) {
      expect(byName[col]?.notNull, col).toBe(true);
    }
    expect(byName["start_time"]?.notNull).toBe(false);
    expect(byName["end_time"]?.notNull).toBe(false);
  });

  it("索引 calendar_entry_user_date 为 (user_id, entry_date) 双列", () => {
    const idx = config.indexes.find(
      (i) => i.config.name === "calendar_entry_user_date",
    );
    expect(idx).toBeDefined();
    const idxCols = idx!.config.columns.map((c) =>
      // 1.0 RC：索引列包装为 config 对象或列实例，取列名归一
      "name" in c ? c.name : (c as { column: { name: string } }).column.name,
    );
    expect(idxCols).toEqual(["user_id", "entry_date"]);
  });

  it("无 DB 级 FK（跨模块引用按 barrel 裁决不建外键）", () => {
    expect(config.foreignKeys ?? []).toHaveLength(0);
  });
});

describe("TIME_HHMM_RE：HH:MM 分钟粒度", () => {
  it.each(["00:00", "09:05", "23:59"])("接受 %s", (t) => {
    expect(TIME_HHMM_RE.test(t)).toBe(true);
  });

  it.each(["24:00", "7:00", "14:0", "14:00:00", ""])("拒收 %s", (t) => {
    expect(TIME_HHMM_RE.test(t)).toBe(false);
  });
});

describe("calendarEntryInputSchema：title 规则（E-01/F-01）", () => {
  it("title 留空 → calendar.error.titleRequired", () => {
    const issues = issuesOf({ ...validBase, title: "" });
    expect(hasIssue(issues, "title", "calendar.error.titleRequired")).toBe(
      true,
    );
  });

  it("title 51 字 → calendar.error.titleTooLong；50 字通过", () => {
    const issues = issuesOf({ ...validBase, title: "x".repeat(51) });
    expect(hasIssue(issues, "title", "calendar.error.titleTooLong")).toBe(true);
    expect(() =>
      calendarEntryInputSchema.parse({ ...validBase, title: "x".repeat(50) }),
    ).not.toThrow();
  });
});

describe("calendarEntryInputSchema：时间规则（F-02/F-03/E-03）", () => {
  it.each(["24:00", "7:00", "14:0"])(
    "非法时间 %s → calendar.error.invalidTime",
    (t) => {
      const issues = issuesOf({ ...validBase, startTime: t });
      expect(hasIssue(issues, "startTime", "calendar.error.invalidTime")).toBe(
        true,
      );
    },
  );

  it.each([
    ["00:00", null],
    ["23:59", null],
    ["14:00", "15:30"],
    ["14:00", null],
    [null, null],
  ])("合法组合 startTime=%s, endTime=%s 通过", (s, e) => {
    expect(() =>
      calendarEntryInputSchema.parse({
        ...validBase,
        startTime: s,
        endTime: e,
      }),
    ).not.toThrow();
  });

  it("date '2026-02-30'（不存在日历日）→ calendar.error.invalidDate", () => {
    const issues = issuesOf({ ...validBase, date: "2026-02-30" });
    expect(hasIssue(issues, "date", "calendar.error.invalidDate")).toBe(true);
  });

  it("refine#1：开始留空而结束有值 → endTime 报 calendar.error.endTimeAfterStart", () => {
    const issues = issuesOf({
      ...validBase,
      startTime: null,
      endTime: "14:00",
    });
    expect(
      hasIssue(issues, "endTime", "calendar.error.endTimeAfterStart"),
    ).toBe(true);
  });

  it.each([
    ["14:00", "14:00"],
    ["14:00", "13:59"],
  ])(
    "refine#2：结束 %s 不晚于开始 %s → calendar.error.endTimeAfterStart",
    (s, e) => {
      const issues = issuesOf({ ...validBase, startTime: s, endTime: e });
      expect(
        hasIssue(issues, "endTime", "calendar.error.endTimeAfterStart"),
      ).toBe(true);
    },
  );
});

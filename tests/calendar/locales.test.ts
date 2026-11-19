import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * calendar i18n 文案键单测(AXY-23 tasks.md Task 3)。
 * E-04 / E-05 文案逐字取自 proposal E 表——locale 值即真源,逐字断言。
 */
function readCalendarJson(): Record<string, Record<string, string>> {
  return JSON.parse(
    readFileSync(resolve(__dirname, "../../src/locales/zh-CN/calendar.json"), "utf8"),
  ) as Record<string, Record<string, string>>;
}

describe("calendar.week 文案键(AXY-23)", () => {
  const calendar = readCalendarJson();
  const week = calendar.week ?? {};

  it("E-04 逐字:emptyWeek === '这周还没有安排'", () => {
    expect(week.emptyWeek).toBe("这周还没有安排");
  });

  it("E-05 逐字:loadFailed === '加载失败,请重试'", () => {
    expect(week.loadFailed).toBe("加载失败,请重试");
  });

  it("其余九键存在且非空字符串", () => {
    const keys = [
      "viewWeek",
      "viewMonth",
      "prevWeek",
      "nextWeek",
      "today",
      "allDay",
      "retry",
      "nowLine",
      "createAt",
    ] as const;
    for (const key of keys) {
      expect(week[key], `calendar.week.${key}`).toBeTruthy();
    }
  });

  it("createAt 含 {weekday} 与 {time} 插值占位", () => {
    expect(week.createAt).toContain("{weekday}");
    expect(week.createAt).toContain("{time}");
  });
});

// —— Task 7 补口:编辑卡标题键(裁决记录:Task 3 键清单遗漏,随 Task 7 补) ——

describe("calendar.week 编辑卡标题键(AXY-23 Task 7 补口)", () => {
  it("dialogCreate / dialogEdit 存在且非空", () => {
    const week = readCalendarJson().week ?? {};
    expect(week.dialogCreate).toBe("新建条目");
    expect(week.dialogEdit).toBe("编辑条目");
  });
});

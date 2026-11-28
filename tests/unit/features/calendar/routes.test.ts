/**
 * 日历域路由词汇测试(src/features/calendar/routes.ts):parseWeekParam 的
 * 周参数解析回退——缺省/非法(非周一锚)静默回退今天所在周,合法周一透传。
 * today 锚定真实日历日 2026-11-28(周六),其所在周周一为 2026-11-23。
 */
import { describe, expect, it } from "vitest";
import { parseWeekParam } from "@/features/calendar/routes";

const TODAY = "2026-11-28";
const MONDAY_OF_TODAY = "2026-11-23";

describe("parseWeekParam:week 参数解析回退", () => {
  it("week 缺省 → 回退今天所在周周一", () => {
    expect(parseWeekParam({}, TODAY)).toBe(MONDAY_OF_TODAY);
  });

  it("week 为真实日历日但非周一锚(2026-11-17 周二)→ 同回退今天所在周", () => {
    expect(parseWeekParam({ week: "2026-11-17" }, TODAY)).toBe(MONDAY_OF_TODAY);
  });

  it("week 为合法周一(2026-11-16)→ 透传", () => {
    expect(parseWeekParam({ week: "2026-11-16" }, TODAY)).toBe("2026-11-16");
  });
});

/**
 * T2 red 阶段:entry-intent chain 纯函数与输出 schema。
 */
import { describe, expect, it } from "vitest";

import {
  ENTRY_INTENT_PROMPT_VERSION,
  chainEntryIntent,
  entryIntentOutputSchema,
} from "@/agent/prompts/chains/entry-intent";

describe("chainEntryIntent", () => {
  it("导出版本常量 v1", () => {
    expect(ENTRY_INTENT_PROMPT_VERSION).toBe("v1");
  });

  it("messages 含条目原文、追问答复与今日参照", () => {
    const { messages } = chainEntryIntent({
      entryTitle: "学习next框架",
      userRangeHint: "到月底",
      today: "2026-11-19",
    });
    const text = JSON.stringify(messages);
    expect(text).toContain("学习next框架");
    expect(text).toContain("到月底");
    expect(text).toContain("2026-11-19");
  });

  it("userRangeHint 为 null 时不出现追问答复标记", () => {
    const { messages } = chainEntryIntent({
      entryTitle: "学习next框架",
      userRangeHint: null,
      today: "2026-11-19",
    });
    expect(JSON.stringify(messages)).not.toContain("追问答复");
  });
});

describe("entryIntentOutputSchema", () => {
  const base = {
    verdict: "APPLICABLE",
    notApplicableReason: null,
    rangeStart: "2026-11-20",
    rangeEnd: "2026-11-30",
    searchQuery: "Next.js 入门教程",
  };

  it("合法 APPLICABLE 通过", () => {
    expect(entryIntentOutputSchema.safeParse(base).success).toBe(true);
  });

  it("NOT_APPLICABLE 缺 reason 拒绝", () => {
    const parsed = entryIntentOutputSchema.safeParse({
      ...base,
      verdict: "NOT_APPLICABLE",
      notApplicableReason: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("rangeStart 非日期格式拒绝", () => {
    const parsed = entryIntentOutputSchema.safeParse({
      ...base,
      rangeStart: "11月20日",
    });
    expect(parsed.success).toBe(false);
  });

  it("searchQuery 超长拒绝", () => {
    const parsed = entryIntentOutputSchema.safeParse({
      ...base,
      searchQuery: "q".repeat(101),
    });
    expect(parsed.success).toBe(false);
  });
});

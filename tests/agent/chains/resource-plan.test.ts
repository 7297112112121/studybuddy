/**
 * T2 red 阶段:resource-plan chain 纯函数与输出 schema。
 */
import { describe, expect, it } from "vitest";

import {
  RESOURCE_PLAN_PROMPT_VERSION,
  chainResourcePlan,
  resourcePlanOutputSchema,
} from "@/agent/prompts/chains/resource-plan";

describe("chainResourcePlan", () => {
  it("导出版本常量 v1", () => {
    expect(RESOURCE_PLAN_PROMPT_VERSION).toBe("v1");
  });

  it("messages 含条目原文、范围与来源集 URL", () => {
    const { messages } = chainResourcePlan({
      entryTitle: "学习next框架",
      rangeStart: "2026-11-20",
      rangeEnd: "2026-11-30",
      today: "2026-11-19",
      sources: [
        { url: "https://nextjs.org/docs", title: "Next.js Docs", snippet: null },
        { url: "https://example.com/a", title: null, snippet: "示例" },
      ],
    });
    const text = JSON.stringify(messages);
    expect(text).toContain("学习next框架");
    expect(text).toContain("2026-11-20");
    expect(text).toContain("2026-11-30");
    expect(text).toContain("https://nextjs.org/docs");
    expect(text).toContain("https://example.com/a");
  });
});

describe("resourcePlanOutputSchema", () => {
  const day = {
    date: "2026-11-20",
    text: "阅读 Next.js 官方基础教程",
    resources: [{ title: "Next.js Docs", url: "https://nextjs.org/docs" }],
  };
  const base = {
    verdict: "PLAN",
    notFoundReason: null,
    days: [day],
  };

  it("合法 PLAN 通过", () => {
    expect(resourcePlanOutputSchema.safeParse(base).success).toBe(true);
  });

  it("NOT_FOUND 缺 reason 拒绝", () => {
    const parsed = resourcePlanOutputSchema.safeParse({
      ...base,
      verdict: "NOT_FOUND",
      notFoundReason: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("text 51 字拒绝", () => {
    const parsed = resourcePlanOutputSchema.safeParse({
      ...base,
      days: [{ ...day, text: "字".repeat(51) }],
    });
    expect(parsed.success).toBe(false);
  });

  it("resources 为空数组拒绝", () => {
    const parsed = resourcePlanOutputSchema.safeParse({
      ...base,
      days: [{ ...day, resources: [] }],
    });
    expect(parsed.success).toBe(false);
  });

  it("url 非合法 URL 拒绝", () => {
    const parsed = resourcePlanOutputSchema.safeParse({
      ...base,
      days: [
        {
          ...day,
          resources: [{ title: "x", url: "nextjs.org/docs" }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

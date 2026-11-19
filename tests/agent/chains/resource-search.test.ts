/**
 * T4 补充 red 阶段:resource-search chain(检索调用消息构造)。
 */
import { describe, expect, it } from "vitest";

import {
  RESOURCE_SEARCH_PROMPT_VERSION,
  chainResourceSearch,
} from "@/agent/prompts/chains/resource-search";

describe("chainResourceSearch", () => {
  it("导出版本常量 v1", () => {
    expect(RESOURCE_SEARCH_PROMPT_VERSION).toBe("v1");
  });

  it("messages 含主题、建议查询词与搜索指令", () => {
    const { messages } = chainResourceSearch({
      entryTitle: "学习next框架",
      searchQuery: "Next.js 官方教程 入门",
      today: "2026-11-19",
    });
    const text = JSON.stringify(messages);
    expect(text).toContain("学习next框架");
    expect(text).toContain("Next.js 官方教程 入门");
    expect(text).toContain("2026-11-19");
    expect(text).toContain("搜索");
  });
});

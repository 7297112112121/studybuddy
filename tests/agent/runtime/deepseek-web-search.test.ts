/**
 * T3 red 阶段:runWebSearchCompletion(检索调用封装 + stub 门控)。
 * fetch 一律 stubGlobal 替身,不出网;官方文档失败模式逐条覆盖。
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  runWebSearchCompletion,
  type WebSearchSource,
} from "@/agent/runtime/deepseek-web-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const messages = [{ role: "user" as const, content: "学习next框架 11.20–11.30" }];

/** Chat Completions 响应:来源走 server_tool_calls.sources + annotations.url_citation。 */
function searchResponse(
  sources: { url: string; title: string | null; snippet?: string | null }[],
  annotations: { url: string; title?: string | null }[] = [],
): unknown {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: "已检索到资料",
          server_tool_calls: [
            {
              index: 0,
              calls: [
                {
                  id: "s1",
                  type: "deepseek_web_search",
                  kind: "search",
                  status: "completed",
                  action: { type: "search", queries: ["Next.js"] },
                  sources: sources.map((s) => ({
                    type: "url",
                    url: s.url,
                    title: s.title,
                    snippet: s.snippet ?? null,
                  })),
                },
              ],
            },
          ],
          annotations: annotations.map((a) => ({
            type: "url_citation",
            url_citation: { url: a.url, title: a.title ?? "" },
          })),
        },
      },
    ],
  };
}

describe("runWebSearchCompletion 请求形态", () => {
  it("POST deepseek-flash + deepseek_web_search 声明,无 response_format,Bearer 鉴权", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(searchResponse([{ url: "https://a.com", title: "A" }])),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");

    await runWebSearchCompletion(messages);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("deepseek-flash");
    expect(body.tools).toEqual([{ type: "deepseek_web_search" }]);
    expect(body.response_format).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-test",
    );
  });
});

describe("runWebSearchCompletion 错误归一(Review Focus 1)", () => {
  it.each([
    ["200+error 块", () => jsonResponse({ error: { message: "generation failed" } })],
    ["5xx", () => jsonResponse({}, 500)],
    ["fetch reject", () => Promise.reject(new Error("network down"))],
  ])("%s 归一 AI_UNAVAILABLE,不抛裸异常", async (_name, responder) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(responder));
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const result = await runWebSearchCompletion(messages);
    expect(result).toEqual({ ok: false, error: "AI_UNAVAILABLE" });
  });
});

describe("runWebSearchCompletion 来源聚合", () => {
  it("server_tool_calls.sources 与 url_citation 聚合并按 URL 去重", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          searchResponse(
            [
              { url: "https://nextjs.org/docs", title: "Next.js Docs", snippet: "官方文档" },
              { url: "https://example.com/a", title: null, snippet: "示例" },
            ],
            [
              { url: "https://nextjs.org/docs" }, // 与 sources 重复,去重
              { url: "https://example.com/b", title: "B 页" },
            ],
          ),
        ),
      ),
    );
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");

    const result = await runWebSearchCompletion(messages);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const urls = result.sources.map((s: WebSearchSource) => s.url);
    expect(urls).toHaveLength(3);
    expect(urls).toContain("https://nextjs.org/docs");
    expect(urls).toContain("https://example.com/a");
    expect(urls).toContain("https://example.com/b");
  });
});

describe("stub 门控(Review Focus 5)", () => {
  it("DEEPSEEK_STUB_FIXTURE 未设时不走 stub(真实 fetch 被调用)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(searchResponse([{ url: "https://real.com", title: "R" }])),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    // 注意:不设 DEEPSEEK_STUB_FIXTURE

    const result = await runWebSearchCompletion(messages);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok && result.sources[0]?.url).toBe("https://real.com");
  });

  it("DEEPSEEK_STUB_FIXTURE=1 时不出网,按关键词返回固定语料", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("DEEPSEEK_STUB_FIXTURE", "1");

    const plan = await runWebSearchCompletion([
      { role: "user", content: "学习next框架 11.20–11.30" },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.sources.length).toBeGreaterThanOrEqual(3);
    }
  });
});

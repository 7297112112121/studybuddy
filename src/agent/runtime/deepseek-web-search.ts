/**
 * DeepSeek 检索调用封装(AXY-24 design「契约」节,ADR-0028 逃生舱):
 * 声明式服务端工具 deepseek_web_search 经 Chat Completions API 直连——
 * AI SDK 抽象层尚未暴露该 DeepSeek 特有服务端工具,按 ADR-0014「逃生舱」
 * 条款局部直连,不改主接入面。
 *
 * 官方文档失败模式逐条归一(Review Focus 1):
 * - HTTP 200 + 响应体 error 块(生成失败)→ AI_UNAVAILABLE
 * - 5xx / 网络异常 → AI_UNAVAILABLE
 * 本模块零业务知识:输入只认 messages,输出只含文本与来源。
 */
import type { ModelMessage } from "ai";

import { aiStubEnabled, stubSearchSources } from "./ai-stub-fixture";

/** 检索来源(唯一合法 URL 池的原料,规划层强制引用)。 */
export type WebSearchSource = {
  url: string;
  title: string | null;
  snippet: string | null;
};

export type WebSearchCompletion =
  | { ok: true; text: string; sources: WebSearchSource[] }
  | { ok: false; error: "AI_UNAVAILABLE" };

const DEEPSEEK_CHAT_COMPLETIONS_URL =
  "https://api.deepseek.com/chat/completions";

/** server_tool_calls[].calls[].sources 条目(官方扩展字段)。 */
type ServerToolSource = { url?: unknown; title?: unknown; snippet?: unknown };

type ServerToolCall = {
  calls?: { sources?: ServerToolSource[]; status?: string }[];
};

type CitationAnnotation = {
  url_citation?: { url?: unknown; title?: unknown };
};

type ChatCompletionResponse = {
  error?: { message?: unknown };
  choices?: {
    message?: {
      content?: string;
      server_tool_calls?: ServerToolCall[];
      annotations?: CitationAnnotation[];
    };
  }[];
};

function toSources(list: ServerToolSource[] | undefined): WebSearchSource[] {
  if (!list) return [];
  return list
    .filter(
      (s): s is ServerToolSource & { url: string } => typeof s.url === "string",
    )
    .map((s) => ({
      url: s.url,
      title: typeof s.title === "string" ? s.title : null,
      snippet: typeof s.snippet === "string" ? s.snippet : null,
    }));
}

function parseSources(response: ChatCompletionResponse): WebSearchSource[] {
  const message = response.choices?.[0]?.message;
  // server_tool_calls 是「步」数组,来源在每步 calls[].sources(官方结构)
  const fromTools: WebSearchSource[] = (
    message?.server_tool_calls ?? []
  ).flatMap((step) =>
    (step.calls ?? []).flatMap((call) => toSources(call.sources)),
  );
  const fromCitations: WebSearchSource[] = (message?.annotations ?? []).flatMap(
    (a) =>
      toSources([{ url: a.url_citation?.url, title: a.url_citation?.title }]),
  );
  // 按 URL 去重(sources 与 citations 常重叠),保序取首见
  const byUrl = new Map<string, WebSearchSource>();
  for (const source of [...fromTools, ...fromCitations]) {
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, source);
    }
  }
  return [...byUrl.values()];
}

/** 检索调用:deepseek-flash + deepseek_web_search,非流式;失败归一,不抛。 */
export async function runWebSearchCompletion(
  messages: ModelMessage[],
): Promise<WebSearchCompletion> {
  if (aiStubEnabled()) {
    return {
      ok: true,
      text: "(stub) 已检索到固定来源",
      sources: stubSearchSources(),
    };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  let response: Response;
  try {
    response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        // 声明式服务端工具:搜索与抓取在服务端完成(ADR-0028);
        // 不带 response_format——声明联网工具时结构化输出返回 400
        tools: [{ type: "deepseek_web_search" }],
        messages,
      }),
    });
  } catch {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  if (!response.ok) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  let body: ChatCompletionResponse;
  try {
    body = (await response.json()) as ChatCompletionResponse;
  } catch {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  // 官方「生成失败」条款:HTTP 200 但响应体携带 error 块
  if (body.error) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  const message = body.choices?.[0]?.message;
  if (!message) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  return {
    ok: true,
    text: message.content ?? "",
    sources: parseSources(body),
  };
}

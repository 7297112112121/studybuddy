/**
 * T4 red 阶段:filterPlanDays 过滤五规则 + requestEntryProposal 编排。
 * agent runtime 与 db 全部 mock,不出网、不落库。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateStructuredMock = vi.hoisted(() => vi.fn());
const runWebSearchMock = vi.hoisted(() => vi.fn());
const limitMock = vi.hoisted(() => vi.fn());

vi.mock("@/agent/runtime/deepseek-model", () => ({
  generateStructured: generateStructuredMock,
}));
vi.mock("@/agent/runtime/deepseek-web-search", () => ({
  runWebSearchCompletion: runWebSearchMock,
}));
vi.mock("@/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: limitMock }),
      }),
    }),
  },
}));

import {
  AiUnavailableError,
  EntryNotFoundError,
  filterPlanDays,
  requestEntryProposal,
} from "@/modules/calendar/proposal";
import type { WebSearchSource } from "@/agent/runtime/deepseek-web-search";

afterEach(() => {
  generateStructuredMock.mockReset();
  runWebSearchMock.mockReset();
  limitMock.mockReset();
});

const SOURCES: WebSearchSource[] = [
  { url: "https://nextjs.org/docs", title: "Docs", snippet: null },
  { url: "https://nextjs.org/learn", title: "Learn", snippet: null },
];

function day(date: string, urls: string[]) {
  return {
    date,
    text: `安排-${date}`,
    resources: urls.map((url) => ({ title: "资料", url })),
  };
}

describe("filterPlanDays(纯函数五规则)", () => {
  it("日期越界剔除", () => {
    const days = filterPlanDays(
      {
        days: [
          day("2026-11-20", [SOURCES[0].url]),
          day("2026-12-01", [SOURCES[0].url]),
        ],
      },
      "2026-11-20",
      "2026-11-30",
      SOURCES,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-11-20"]);
  });

  it("同日去重保留首条", () => {
    const days = filterPlanDays(
      {
        days: [
          day("2026-11-20", [SOURCES[0].url]),
          day("2026-11-20", [SOURCES[1].url]),
        ],
      },
      "2026-11-20",
      "2026-11-30",
      SOURCES,
    );
    expect(days).toHaveLength(1);
    expect(days[0].resources[0].url).toBe(SOURCES[0].url);
  });

  it("超范围天数截断(11-20 至 11-21 共 2 天,第 3 条被截)", () => {
    const days = filterPlanDays(
      {
        days: [
          day("2026-11-20", [SOURCES[0].url]),
          day("2026-11-21", [SOURCES[0].url]),
          day("2026-11-22", [SOURCES[0].url]),
        ],
      },
      "2026-11-20",
      "2026-11-21",
      SOURCES,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-11-20", "2026-11-21"]);
  });

  it("URL ∉ 来源集整条剔除(Review Focus 3)", () => {
    const days = filterPlanDays(
      {
        days: [
          day("2026-11-20", [SOURCES[0].url]),
          day("2026-11-21", ["https://evil.example.com/fake"]),
        ],
      },
      "2026-11-20",
      "2026-11-30",
      SOURCES,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-11-20"]);
  });

  it("过滤后空返回空数组(编排层转 NOT_FOUND)", () => {
    const days = filterPlanDays(
      { days: [day("2026-11-20", ["https://evil.example.com/fake"])] },
      "2026-11-20",
      "2026-11-30",
      SOURCES,
    );
    expect(days).toEqual([]);
  });
});

describe("requestEntryProposal 编排", () => {
  function stubEntryFound(): void {
    limitMock.mockResolvedValue([
      {
        id: "entry-1",
        userId: "u1",
        entryDate: "2026-11-20",
        title: "学习next框架",
      },
    ]);
  }

  const intentApplicable = {
    ok: true as const,
    object: {
      verdict: "APPLICABLE",
      notApplicableReason: null,
      rangeStart: "2026-11-20",
      rangeEnd: "2026-11-30",
      searchQuery: "Next.js 入门",
    },
  };
  const planOk = {
    ok: true as const,
    object: {
      verdict: "PLAN",
      notFoundReason: null,
      days: [
        day("2026-11-20", [SOURCES[0].url]),
        day("2026-11-21", [SOURCES[1].url]),
      ],
    },
  };

  beforeEach(() => {
    stubEntryFound();
  });

  it("APPLICABLE 走检索+规划全链,返回 PLAN", async () => {
    generateStructuredMock
      .mockResolvedValueOnce(intentApplicable)
      .mockResolvedValueOnce(planOk);
    runWebSearchMock.mockResolvedValueOnce({
      ok: true,
      text: "ok",
      sources: SOURCES,
    });

    const proposal = await requestEntryProposal("u1", "entry-1", null);

    expect(proposal).toEqual({
      kind: "PLAN",
      days: planOk.object.days,
    });
    expect(runWebSearchMock).toHaveBeenCalledTimes(1);
    expect(generateStructuredMock).toHaveBeenCalledTimes(2);
  });

  it("检索零来源 → NOT_FOUND 且不重试(Constraint 12)", async () => {
    generateStructuredMock
      .mockResolvedValueOnce(intentApplicable)
      .mockResolvedValueOnce(planOk);
    runWebSearchMock.mockResolvedValueOnce({ ok: true, text: "", sources: [] });

    const proposal = await requestEntryProposal("u1", "entry-1", null);

    expect(proposal).toEqual({
      kind: "NOT_FOUND",
      reason: "未检索到与该主题相关的资料来源",
    });
    expect(runWebSearchMock).toHaveBeenCalledTimes(1);
  });

  it("NEEDS_RANGE 无答复 → 返回 NEEDS_RANGE,不检索", async () => {
    generateStructuredMock.mockResolvedValueOnce({
      ok: true,
      object: {
        verdict: "NEEDS_RANGE",
        notApplicableReason: null,
        rangeStart: null,
        rangeEnd: null,
        searchQuery: "q",
      },
    });

    const proposal = await requestEntryProposal("u1", "entry-1", null);

    expect(proposal).toEqual({ kind: "NEEDS_RANGE" });
    expect(runWebSearchMock).not.toHaveBeenCalled();
    expect(generateStructuredMock).toHaveBeenCalledTimes(1);
  });

  it("NEEDS_RANGE + 答复重判出 APPLICABLE → PLAN(答复进入第二次调用)", async () => {
    generateStructuredMock
      .mockResolvedValueOnce({
        ok: true,
        object: {
          verdict: "NEEDS_RANGE",
          notApplicableReason: null,
          rangeStart: null,
          rangeEnd: null,
          searchQuery: "q",
        },
      })
      .mockResolvedValueOnce(intentApplicable)
      .mockResolvedValueOnce(planOk);
    runWebSearchMock.mockResolvedValueOnce({
      ok: true,
      text: "ok",
      sources: SOURCES,
    });

    const proposal = await requestEntryProposal("u1", "entry-1", "到月底");

    expect(proposal).toEqual({ kind: "PLAN", days: planOk.object.days });
    const secondIntentCall = generateStructuredMock.mock.calls[1][0];
    expect(JSON.stringify(secondIntentCall.messages)).toContain("到月底");
  });

  it("答复重判仍 NEEDS_RANGE → NEEDS_RANGE_INCOMPREHENSIBLE", async () => {
    const needsRange = {
      ok: true as const,
      object: {
        verdict: "NEEDS_RANGE",
        notApplicableReason: null,
        rangeStart: null,
        rangeEnd: null,
        searchQuery: "q",
      },
    };
    generateStructuredMock
      .mockResolvedValueOnce(needsRange)
      .mockResolvedValueOnce(needsRange);

    const proposal = await requestEntryProposal("u1", "entry-1", "随便");

    expect(proposal).toEqual({ kind: "NEEDS_RANGE_INCOMPREHENSIBLE" });
    expect(runWebSearchMock).not.toHaveBeenCalled();
  });

  it("NOT_APPLICABLE 直返含理由", async () => {
    generateStructuredMock.mockResolvedValueOnce({
      ok: true,
      object: {
        verdict: "NOT_APPLICABLE",
        notApplicableReason: "日常购物事项",
        rangeStart: null,
        rangeEnd: null,
        searchQuery: "q",
      },
    });

    const proposal = await requestEntryProposal("u1", "entry-1", null);

    expect(proposal).toEqual({
      kind: "NOT_APPLICABLE",
      reason: "日常购物事项",
    });
  });

  it("意图判定 AI_UNAVAILABLE → throw AiUnavailableError", async () => {
    generateStructuredMock.mockResolvedValueOnce({
      ok: false,
      error: "AI_UNAVAILABLE",
    });

    await expect(
      requestEntryProposal("u1", "entry-1", null),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("条目不存在或不属该用户 → throw EntryNotFoundError", async () => {
    limitMock.mockResolvedValue([]);
    await expect(
      requestEntryProposal("u1", "entry-x", null),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});

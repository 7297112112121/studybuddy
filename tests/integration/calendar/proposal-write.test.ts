/**
 * T5 red 阶段:confirmEntryProposal 事务 + 两 Server Action。
 * 真实 PG;AI 层 mock(不出网);沿 actions.test.ts 造号与会话模式。
 */
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentSessionMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const generateStructuredMock = vi.hoisted(() => vi.fn());
const runWebSearchMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));
vi.mock("@/agent/runtime/deepseek-model", () => ({
  generateStructured: generateStructuredMock,
}));
vi.mock("@/agent/runtime/deepseek-web-search", () => ({
  runWebSearchCompletion: runWebSearchMock,
}));

import { db } from "@/db/client";
import { calendarEntry, entryResource, user } from "@/db/schema";
import {
  requestProposalAction,
  confirmProposalAction,
} from "@/modules/calendar/actions";

afterAll(async () => {
  await db.$client.end();
});

beforeEach(() => {
  revalidatePathMock.mockReset();
  generateStructuredMock.mockReset();
  runWebSearchMock.mockReset();
});

function signIn(userId: string): void {
  getCurrentSessionMock.mockResolvedValue({
    user: { id: userId, name: "cal", username: "cal" },
    session: { id: "s1", userId, expiresAt: new Date() },
  });
}

async function makeUser(tag: string): Promise<string> {
  const id = `axy24-${tag}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: id,
    email: `${id}@e2e.local`,
    username: id,
    agreementVersion: "v1",
    agreedAt: new Date(),
  });
  return id;
}

async function makeEntry(userId: string, title: string): Promise<string> {
  const [row] = await db
    .insert(calendarEntry)
    .values({ userId, entryDate: "2026-11-20", title })
    .returning({ id: calendarEntry.id });
  return row.id;
}

const SOURCES = [
  { url: "https://nextjs.org/docs", title: "Docs", snippet: null },
  { url: "https://example.com/b", title: "B", snippet: null },
];

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

describe("confirmProposalAction 写入事务", () => {
  it("成功路径:N 条目 + M 资料落库且归属正确、时间均为 null", async () => {
    const u1 = await makeUser("w-ok");
    signIn(u1);
    const entryId = await makeEntry(u1, "学习next框架");

    const result = await confirmProposalAction({
      entryId,
      days: [
        {
          date: "2026-11-21",
          text: "阅读官方文档",
          resources: [
            { title: "Docs", url: SOURCES[0].url },
            { title: "B", url: SOURCES[1].url },
          ],
        },
        {
          date: "2026-11-22",
          text: "跟学课程",
          resources: [{ title: "B", url: SOURCES[1].url }],
        },
      ],
    });

    expect(result).toEqual({ ok: true });
    const entries = await db
      .select()
      .from(calendarEntry)
      .where(and(eq(calendarEntry.userId, u1), eq(calendarEntry.entryDate, "2026-11-21")));
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("阅读官方文档");
    expect(entries[0].startTime).toBeNull();
    expect(entries[0].endTime).toBeNull();

    const resources = await db
      .select()
      .from(entryResource)
      .where(eq(entryResource.entryId, entries[0].id));
    expect(resources).toHaveLength(2);

    expect(revalidatePathMock).toHaveBeenCalledWith("/calendar");
  });

  it("事务内校验失败(第二条 51 字)→ WRITE_FAILED 且零残留(Review Focus 2)", async () => {
    const u1 = await makeUser("w-rollback");
    signIn(u1);
    const entryId = await makeEntry(u1, "学习next框架");
    const before = await db.select().from(calendarEntry).where(eq(calendarEntry.userId, u1));

    const result = await confirmProposalAction({
      entryId,
      days: [
        {
          date: "2026-11-21",
          text: "合法的一天",
          resources: [{ title: "Docs", url: SOURCES[0].url }],
        },
        {
          date: "2026-11-22",
          text: "字".repeat(51), // zod 在事务内逐天校验时抛出 → 整体回滚
          resources: [{ title: "Docs", url: SOURCES[0].url }],
        },
      ],
    });

    expect(result).toEqual({ ok: false, error: "WRITE_FAILED" });
    const after = await db.select().from(calendarEntry).where(eq(calendarEntry.userId, u1));
    expect(after.length).toBe(before.length);
    const resources = await db.select().from(entryResource);
    expect(resources.filter((r) => r.title === "合法的一天")).toHaveLength(0);
  });

  it("来源条目不属该用户 → NOT_FOUND(与不存在同形,Review Focus 4)", async () => {
    const owner = await makeUser("w-owner");
    const other = await makeUser("w-other");
    const entryId = await makeEntry(owner, "别人的条目");

    signIn(other);
    expect(
      await confirmProposalAction({
        entryId,
        days: [
          {
            date: "2026-11-21",
            text: "x",
            resources: [{ title: "Docs", url: SOURCES[0].url }],
          },
        ],
      }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("requestProposalAction", () => {
  it("F-01 留空答复 → INVALID_INPUT 且 fieldErrors.answer 为 i18n key", async () => {
    const u1 = await makeUser("r-empty");
    signIn(u1);
    const entryId = await makeEntry(u1, "学习next框架");

    expect(await requestProposalAction(entryId, "")).toEqual({
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: { answer: "calendar.proposal.answerRequired" },
    });
  });

  it("答复超 200 字 → INVALID_INPUT", async () => {
    const u1 = await makeUser("r-long");
    signIn(u1);
    const entryId = await makeEntry(u1, "学习next框架");

    const result = await requestProposalAction(entryId, "字".repeat(201));
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "INVALID_INPUT") {
      expect(result.fieldErrors.answer).toBe("calendar.proposal.answerRequired");
    }
  });

  it("越权:乙会话请求甲条目 → NOT_FOUND(Review Focus 4)", async () => {
    const owner = await makeUser("r-owner");
    const other = await makeUser("r-other");
    const entryId = await makeEntry(owner, "学习next框架");

    signIn(other);
    expect(await requestProposalAction(entryId, null)).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("成功路径:返回 PLAN 提案且 AI 恰好各调一次", async () => {
    const u1 = await makeUser("r-ok");
    signIn(u1);
    const entryId = await makeEntry(u1, "学习next框架 11.20–11.30");

    generateStructuredMock
      .mockResolvedValueOnce(intentApplicable)
      .mockResolvedValueOnce({
        ok: true,
        object: {
          verdict: "PLAN",
          notFoundReason: null,
          days: [
            {
              date: "2026-11-20",
              text: "阅读官方文档",
              resources: [{ title: "Docs", url: SOURCES[0].url }],
            },
          ],
        },
      });
    runWebSearchMock.mockResolvedValueOnce({ ok: true, text: "ok", sources: SOURCES });

    const result = await requestProposalAction(entryId, null);

    expect(result).toEqual({
      ok: true,
      proposal: {
        kind: "PLAN",
        days: [
          {
            date: "2026-11-20",
            text: "阅读官方文档",
            resources: [{ title: "Docs", url: SOURCES[0].url }],
          },
        ],
      },
    });
    expect(generateStructuredMock).toHaveBeenCalledTimes(2);
    expect(runWebSearchMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * calendar AI 提案编排(AXY-24 design「契约」节):业务知识在此,
 * AI 能力经 @/agent/runtime 公共面消费(代码目录依赖规则 2)。
 *
 * 编排流:读条目(恒带 userId 条件,R11)→ 意图判定 → 分支:
 * - APPLICABLE:检索(deepseek_web_search)→ 规划 → filterPlanDays 过滤
 *   (空 → NOT_FOUND)
 * - NEEDS_RANGE:无答复即返;有答复重判一次,仍无范围 → INCOMPREHENSIBLE
 *   (不重试,design 开放问题 #2 假设)
 * - NOT_APPLICABLE:直返含理由
 *
 * 提案是界面临时态,本模块不写库(D-13);确认写入在 confirmEntryProposal。
 * filterPlanDays 保证「资料 URL ∈ 检索来源集」不变量(链接真实可达的
 * 代码半边,提示词半边在 resource-plan chain)。
 */
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { isValidDateString } from "./month";
import {
  chainEntryIntent,
  entryIntentOutputSchema,
} from "@/agent/prompts/chains/entry-intent";
import {
  chainResourcePlan,
  resourcePlanOutputSchema,
} from "@/agent/prompts/chains/resource-plan";
import { chainResourceSearch } from "@/agent/prompts/chains/resource-search";
import { generateStructured } from "@/agent/runtime/deepseek-model";
import {
  runWebSearchCompletion,
  type WebSearchSource,
} from "@/agent/runtime/deepseek-web-search";
import { calendarEntry, calendarEntryInputSchema, entryResource } from "./schema";

export type ProposalResource = { title: string; url: string };

export type ProposalDay = {
  date: string; // "YYYY-MM-DD",∈ [rangeStart, rangeEnd]
  text: string; // 1—50 字
  resources: ProposalResource[]; // ≥1,url ∈ 检索来源集(代码不变量)
};

export type EntryProposal =
  | { kind: "PLAN"; days: ProposalDay[] }
  | { kind: "NEEDS_RANGE" }
  | { kind: "NEEDS_RANGE_INCOMPREHENSIBLE" }
  | { kind: "NOT_APPLICABLE"; reason: string }
  | { kind: "NOT_FOUND"; reason: string };

/** 条目不存在或不属该用户(action 归一 NOT_FOUND,不泄漏存在性)。 */
export class EntryNotFoundError extends Error {
  constructor() {
    super("entry not found for user");
  }
}

/** AI 层不可用(action 归一 AI_UNAVAILABLE → E-04)。 */
export class AiUnavailableError extends Error {
  constructor() {
    super("ai unavailable");
  }
}

function todayString(): string {
  // 服务端本地时区的字面日期(与 calendar_entry date mode:'string' 同口径)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 条目范围内天数(含首尾)。 */
function rangeDayCount(rangeStart: string, rangeEnd: string): number {
  const startMs = Date.parse(`${rangeStart}T00:00:00Z`);
  const endMs = Date.parse(`${rangeEnd}T00:00:00Z`);
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

type RawPlanDay = { date: string; text: string; resources: ProposalResource[] };

/**
 * 过滤五规则(design「需求承载对照」R2):日期越界剔除、同日去重保留首条、
 * 截断至范围天数、任一资源 URL ∉ 来源集整条剔除;纯函数。
 */
export function filterPlanDays(
  plan: { days: RawPlanDay[] },
  rangeStart: string,
  rangeEnd: string,
  sources: WebSearchSource[],
): ProposalDay[] {
  const sourceUrls = new Set(sources.map((s) => s.url));
  const maxDays = rangeDayCount(rangeStart, rangeEnd);

  const kept: ProposalDay[] = [];
  const seenDates = new Set<string>();
  for (const raw of plan.days) {
    if (kept.length >= maxDays) break;
    if (raw.date < rangeStart || raw.date > rangeEnd) continue; // 越界
    if (seenDates.has(raw.date)) continue; // 同日去重
    if (raw.resources.some((r) => !sourceUrls.has(r.url))) continue; // URL 不变量
    seenDates.add(raw.date);
    kept.push({ date: raw.date, text: raw.text, resources: raw.resources });
  }
  return kept;
}

/** 读条目(恒带 userId 条件);不存在或不属该用户 throw EntryNotFoundError。 */
async function readEntry(
  userId: string,
  entryId: string,
): Promise<{ id: string; title: string }> {
  const rows = await db
    .select({ id: calendarEntry.id, title: calendarEntry.title })
    .from(calendarEntry)
    .where(and(eq(calendarEntry.id, entryId), eq(calendarEntry.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw new EntryNotFoundError();
  }
  return rows[0];
}

type EntryIntent = z.infer<typeof entryIntentOutputSchema>;
type ResourcePlan = z.infer<typeof resourcePlanOutputSchema>;

/** 一次结构化调用;AI 不可用 throw AiUnavailableError。 */
async function structured<S extends z.ZodType>(args: {
  schema: S;
  messages: import("ai").ModelMessage[];
}): Promise<z.infer<S>> {
  const result = await generateStructured(args);
  if (!result.ok) {
    throw new AiUnavailableError();
  }
  return result.object;
}

/** 提案编排主入口;错误契约见类型定义。 */
export async function requestEntryProposal(
  userId: string,
  entryId: string,
  userRangeAnswer: string | null,
): Promise<EntryProposal> {
  const entry = await readEntry(userId, entryId);
  const today = todayString();

  let intent: EntryIntent = await structured({
    schema: entryIntentOutputSchema,
    messages: chainEntryIntent({
      entryTitle: entry.title,
      userRangeHint: userRangeAnswer,
      today,
    }).messages,
  });

  if (intent.verdict === "NEEDS_RANGE" && userRangeAnswer !== null) {
    // 答复重判一次(仅一次,不循环)
    const retried: EntryIntent = await structured({
      schema: entryIntentOutputSchema,
      messages: chainEntryIntent({
        entryTitle: entry.title,
        userRangeHint: userRangeAnswer,
        today,
      }).messages,
    });
    if (retried.verdict === "NEEDS_RANGE") {
      return { kind: "NEEDS_RANGE_INCOMPREHENSIBLE" };
    }
    intent = retried;
  }

  if (intent.verdict === "NEEDS_RANGE") {
    return { kind: "NEEDS_RANGE" };
  }
  if (intent.verdict === "NOT_APPLICABLE") {
    return {
      kind: "NOT_APPLICABLE",
      reason: intent.notApplicableReason ?? "该条目不适用",
    };
  }

  const rangeStart = intent.rangeStart ?? today;
  const rangeEnd = intent.rangeEnd ?? rangeStart;

  // 检索:零来源直接 NOT_FOUND(不重试,Constraint 12)
  const search = await runWebSearchCompletion(
    chainResourceSearch({
      entryTitle: entry.title,
      searchQuery: intent.searchQuery,
      today,
    }).messages,
  );
  if (!search.ok) {
    throw new AiUnavailableError();
  }
  if (search.sources.length === 0) {
    return { kind: "NOT_FOUND", reason: "未检索到与该主题相关的资料来源" };
  }

  const plan: ResourcePlan = await structured({
    schema: resourcePlanOutputSchema,
    messages: chainResourcePlan({
      entryTitle: entry.title,
      rangeStart,
      rangeEnd,
      today,
      sources: search.sources,
    }).messages,
  });

  if (plan.verdict === "NOT_FOUND") {
    return {
      kind: "NOT_FOUND",
      reason: plan.notFoundReason ?? "未找到合适的资料",
    };
  }

  const days = filterPlanDays(plan, rangeStart, rangeEnd, search.sources);
  if (days.length === 0) {
    return { kind: "NOT_FOUND", reason: "生成的安排未能通过资料来源校验" };
  }
  return { kind: "PLAN", days };
}

// ── 确认写入(D-12 整单原子)──────────────────────────────────────────

/** 确认载荷:action 层只做结构校验;字段规则(长度/日期/URL scheme)在事务内逐天校验——
 * 校验失败发生在事务内才能验证「零残留」回滚(Review Focus 2)。 */
export const confirmedProposalSchema = z.object({
  entryId: z.string().uuid(),
  days: z
    .array(
      z.object({
        date: z.string(),
        text: z.string(),
        resources: z
          .array(z.object({ title: z.string(), url: z.string() }))
          .min(1),
      }),
    )
    .min(1), // 全部删光由客户端视为放弃不发请求(D-13)
});

export type ConfirmedProposal = z.infer<typeof confirmedProposalSchema>;

const RESOURCE_URL_RE = /^https?:\/\//;

/** 事务内逐天校验:复用 calendarEntryInputSchema(条目半边)+ 资料字段规则(F-04/F-05)。 */
function validateDay(day: ConfirmedProposal["days"][number]): void {
  const parsed = calendarEntryInputSchema.safeParse({
    date: day.date,
    title: day.text,
    startTime: null,
    endTime: null,
  });
  if (!parsed.success) {
    throw new Error(`proposal day invalid: ${day.date}`);
  }
  if (day.resources.length === 0) {
    throw new Error(`proposal day has no resources: ${day.date}`);
  }
  for (const resource of day.resources) {
    if (resource.title.length < 1 || resource.title.length > 50) {
      throw new Error(`proposal resource title invalid: ${day.date}`);
    }
    if (!RESOURCE_URL_RE.test(resource.url)) {
      throw new Error(`proposal resource url invalid: ${day.date}`);
    }
  }
}

/**
 * 确认写入:单事务内逐天 INSERT calendar_entry(标题=day.text、日期=day.date、
 * 时间均 null)+ INSERT 其 entry_resource 行;任一步失败整体回滚(D-12 零残留)。
 * 返回 false = 来源条目不存在或不属该用户(NOT_FOUND 同形,不泄漏存在性)。
 */
export async function confirmEntryProposal(
  userId: string,
  proposal: ConfirmedProposal,
): Promise<boolean> {
  const owned = await db
    .select({ id: calendarEntry.id })
    .from(calendarEntry)
    .where(
      and(
        eq(calendarEntry.id, proposal.entryId),
        eq(calendarEntry.userId, userId),
      ),
    )
    .limit(1);
  if (owned.length === 0) {
    return false;
  }

  await db.transaction(async (tx) => {
    for (const day of proposal.days) {
      validateDay(day); // 校验在事务内:失败即抛 → 整体回滚(零残留)
      const [entry] = await tx
        .insert(calendarEntry)
        .values({
          userId,
          entryDate: day.date,
          title: day.text,
          startTime: null,
          endTime: null,
        })
        .returning({ id: calendarEntry.id });
      await tx.insert(entryResource).values(
        day.resources.map((resource) => ({
          entryId: entry.id,
          title: resource.title,
          url: resource.url,
        })),
      );
    }
  });
  return true;
}

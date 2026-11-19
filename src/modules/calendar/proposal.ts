/**
 * 文件作用:把用户条目编排成 AI 学习提案,供界面临时展示。
 *
 * 成员:
 * 1. 条目不存在错误(EntryNotFoundError):条目不存在或不属于该用户时抛出;
 * 2. AI 不可用错误(AiUnavailableError):AI 服务不可用时抛出;
 * 3. 规划天过滤(filterPlanDays):把 AI 规划天整理成合法提案天;
 * 4. 条目提案编排(requestEntryProposal):提案编排主入口;
 * 5. 确认载荷 schema(confirmedProposalSchema):确认载荷结构校验;
 * 6. 确认条目提案(confirmEntryProposal):把确认的提案写入数据库;
 * 7. 规划天(ProposalDay):提案单日的日期、文字与资料结构;
 * 8. 条目提案(EntryProposal):编排结果联合类型;
 * 9. 确认载荷(ConfirmedProposal):确认写入载荷类型。
 *
 * 其他:
 * 1. 业务知识收在本模块,AI 能力一律经 @/agent/runtime 公共面调用;
 * 2. 本模块不写库,写入由确认条目提案(confirmEntryProposal)承担;
 * 3. 规划天过滤(filterPlanDays)保证资料 URL 全部来自检索来源集
 *    (提示词半边在 resource-plan chain)。
 */
import { z } from "zod";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
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
import {
  calendarEntry,
  calendarEntryInputSchema,
  entryResource,
} from "./schema";
import { rangeDayCount, todayString } from "@/lib/date";

/** 条目不存在或不属于该用户时抛出;调用方按未找到(NOT_FOUND)处理,不泄漏条目是否存在。 */
export class EntryNotFoundError extends Error {
  constructor() {
    super("entry not found for user");
  }
}

/** AI 服务不可用时抛出;调用方按 AI 不可用(AI_UNAVAILABLE)处理。 */
export class AiUnavailableError extends Error {
  constructor() {
    super("ai unavailable");
  }
}

/**
 * 作用:把 AI 生成的规划天整理成合法提案天。纯函数。
 * 检查规则:
 * 1. 超出范围天数即截断;
 * 2. 日期越界剔除;
 * 3. 同日重复保留首条;
 * 4. 任一资料 URL 不在检索来源集,整条剔除。
 */
export function filterPlanDays(
  plan: { days: RawPlanDay[] },
  rangeStart: string,
  rangeEnd: string,
  sources: WebSearchSource[],
): ProposalDay[] {
  const sourceUrls = new Set(sources.map((source) => source.url));
  const maxDays = rangeDayCount(rangeStart, rangeEnd);

  const kept: ProposalDay[] = [];
  const seenDates = new Set<string>();
  for (const raw of plan.days) {
    if (kept.length >= maxDays) break;
    if (raw.date < rangeStart || raw.date > rangeEnd) continue; // 日期越界,剔除
    if (seenDates.has(raw.date)) continue; // 同日重复,保留首条
    if (raw.resources.some((resource) => !sourceUrls.has(resource.url)))
      continue; // URL 不在来源集,整条剔除
    seenDates.add(raw.date);
    kept.push({ date: raw.date, text: raw.text, resources: raw.resources });
  }
  return kept;
}

/**
 * 作用:条目提案编排主入口,产出条目提案(EntryProposal)。
 *
 * 流程:
 * 1. 读条目(必须带 userId 条件);不存在或不属于该用户时,
 *    抛条目不存在错误(EntryNotFoundError)。
 * 2. 判定意图。
 * 3. 判为需要范围(NEEDS_RANGE)且用户已答复时,重判一次;
 *    仍需要范围判无法理解(INCOMPREHENSIBLE),不重试。
 * 4. 判为不适用(NOT_APPLICABLE)时,连同理由直接返回。
 * 5. 检索资料;零来源时判未找到(NOT_FOUND),不重试。
 * 6. 生成规划。
 * 7. 规划天过滤(filterPlanDays);过滤后为空判未找到(NOT_FOUND)。
 *
 * 其他:任一 AI 调用不可用时,抛 AI 不可用错误(AiUnavailableError)。
 */
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

  // 检索:零来源直接判未找到(NOT_FOUND),不重试
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

/**
 * 作用:确认载荷的结构 schema,只做结构校验。
 * 字段级规则(长度、日期、URL 格式)在事务内逐天校验——
 * 校验必须发生在事务内,失败才能触发回滚、验证零残留。
 */
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
    .min(1), // 全部删光由客户端视为放弃不发请求
});

/**
 * 作用:把确认的提案写入数据库,单事务完成,任一天失败即整体回滚。
 * 返回 false:来源条目不存在或不属于该用户——对外与未找到(NOT_FOUND)
 * 表现一致,不泄漏存在性。
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
      validateDay(day); // 校验放事务内:失败即抛,整体回滚
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

export type ProposalDay = {
  date: string; // "YYYY-MM-DD",落在 [rangeStart, rangeEnd] 内
  text: string; // 1~50 字
  resources: ProposalResource[]; // 至少 1 条,url 必须来自检索来源集
};

export type EntryProposal =
  | { kind: "PLAN"; days: ProposalDay[] }
  | { kind: "NEEDS_RANGE" }
  | { kind: "NEEDS_RANGE_INCOMPREHENSIBLE" }
  | { kind: "NOT_APPLICABLE"; reason: string }
  | { kind: "NOT_FOUND"; reason: string };

export type ConfirmedProposal = z.infer<typeof confirmedProposalSchema>;

type ProposalResource = { title: string; url: string };

type RawPlanDay = { date: string; text: string; resources: ProposalResource[] };

type EntryIntent = z.infer<typeof entryIntentOutputSchema>;
type ResourcePlan = z.infer<typeof resourcePlanOutputSchema>;

const RESOURCE_URL_RE = /^https?:\/\//;

/**
 * 作用:读取指定条目的 id 与标题,查询必须带 userId 条件;
 * 条目不存在或不属于该用户时,抛条目不存在错误(EntryNotFoundError)。
 */
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

/**
 * 作用:包装结构化生成(generateStructured),完成一次带 schema 的 AI 调用;
 * AI 不可用时,抛 AI 不可用错误(AiUnavailableError)。
 */
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

/**
 * 作用:在事务内逐天校验确认载荷,任一项不通过即抛错、整体回滚。
 * 校验规则:
 * 1. 日期与标题:复用条目输入 schema(calendarEntryInputSchema);
 * 2. 资料:标题 1~50 字,url 以 http(s) 开头。
 */
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

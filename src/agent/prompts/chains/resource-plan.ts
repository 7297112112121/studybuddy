/**
 * resource-plan chain(AXY-24 design「契约」节):从条目 + 范围 + 检索
 * 来源集产出按天提案。硬规则:资料 URL 只能从来源集中选——这是
 * 「链接真实可达」的提示词半边,代码半边在 calendar/proposal.ts 过滤。
 * 纯函数,零 IO。
 */
import type { ModelMessage } from "ai";
import { z } from "zod";

export const RESOURCE_PLAN_PROMPT_VERSION = "v1";

export const resourcePlanOutputSchema = z
  .object({
    verdict: z.enum(["PLAN", "NOT_FOUND"]),
    // verdict=NOT_FOUND 时必填(E-03 理由口径,AI 原文 ≤200 字)
    notFoundReason: z.string().max(200).nullable(),
    days: z.array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        // 安排文字,写入日程即条目标题(AXY-22 F-01:1—50 字)
        text: z.string().min(1).max(50),
        resources: z
          .array(
            z.object({
              title: z.string().min(1).max(50),
              url: z.string().url(),
            }),
          )
          .min(1),
      }),
    ),
  })
  .refine((v) => v.verdict !== "NOT_FOUND" || v.notFoundReason !== null, {
    message: "notFoundReason required when verdict is NOT_FOUND",
  });

export type ResourcePlanInput = {
  entryTitle: string;
  rangeStart: string; // "YYYY-MM-DD"(意图判定产出,编排层保证非 null)
  rangeEnd: string;
  today: string;
  sources: { url: string; title: string | null; snippet: string | null }[];
};

export function chainResourcePlan(input: ResourcePlanInput): {
  messages: ModelMessage[];
} {
  const sourceLines = input.sources
    .map((s, i) => `${i + 1}. ${s.title ?? "(无标题)"} — ${s.url}`)
    .join("\n");

  const system = [
    "你是学习规划助手,把「学习某主题 + 时间范围」拆成按天的学习安排。",
    "规则:",
    "1. 每天最多一条安排;条目数不超过范围内天数;日期必须落在范围内(YYYY-MM-DD)。",
    "2. 每条安排的 text 是写入日程的标题,中文,不超过 50 字,具体可执行。",
    "3. 每条安排至少配 1 个资料;资料的 url 只能从「检索来源集」里选,不得编造 URL;title 用来源标题(可裁剪到 50 字内)。",
    "4. 来源集没有任何与主题相关的资料,或不足以形成安排 → verdict=NOT_FOUND,在 notFoundReason 用一句话中文说明原因;此时 days 为空数组。",
    "5. 安排从入门到进阶排序,与日期对应。",
  ].join("\n");

  const user = [
    `条目文字:${input.entryTitle}`,
    `学习范围:${input.rangeStart} 至 ${input.rangeEnd}`,
    `今日:${input.today}`,
    "检索来源集:",
    sourceLines,
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
}

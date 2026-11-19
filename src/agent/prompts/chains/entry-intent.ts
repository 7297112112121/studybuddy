/**
 * entry-intent chain(AXY-24 design「契约」节,prompts 三件套形状):
 * 日程条目意图判定——零业务知识的 agent 侧只做格式与消息构造,
 * 业务规则(怎么判学习类、怎么解析范围)作为提示词数据在此声明。
 * 纯函数,零 IO;输出 schema 由 generateStructured 注入校验。
 */
import type { ModelMessage } from "ai";
import { z } from "zod";

export const ENTRY_INTENT_PROMPT_VERSION = "v1";

export const entryIntentOutputSchema = z
  .object({
    verdict: z.enum(["APPLICABLE", "NEEDS_RANGE", "NOT_APPLICABLE"]),
    // verdict=NOT_APPLICABLE 时必填(E-02/E-03 理由口径,AI 原文 ≤200 字)
    notApplicableReason: z.string().max(200).nullable(),
    // 自由文字解析出的起止日期;NEEDS_RANGE 时为 null
    rangeStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    rangeEnd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    // 给检索调用的建议查询词
    searchQuery: z.string().min(1).max(100),
  })
  .refine(
    (v) => v.verdict !== "NOT_APPLICABLE" || v.notApplicableReason !== null,
    {
      message: "notApplicableReason required when verdict is NOT_APPLICABLE",
    },
  );

export type EntryIntentInput = {
  /** 条目文字原文(AXY-22 F-01,≤50 字)。 */
  entryTitle: string;
  /** 追问答复原文(AXY-24 F-01,1—200 字);首轮为 null。 */
  userRangeHint: string | null;
  /** 服务端当日 "YYYY-MM-DD",自由文字日期解析的参照系。 */
  today: string;
};

export function chainEntryIntent(input: EntryIntentInput): {
  messages: ModelMessage[];
} {
  const system = [
    "你是学习日程助手,判定一条日程条目的学习意图。",
    "规则:",
    "1. 判定条目是否为「需要找学习资料的学习类事情」;不是(如日常琐事、购物、陪家人)→ verdict=NOT_APPLICABLE,并在 notApplicableReason 用一句话中文说明原因。",
    "2. 是学习类但无法从文字中确定学习起止日期 → verdict=NEEDS_RANGE,rangeStart/rangeEnd 置 null。",
    "3. 能确定起止日期 → verdict=APPLICABLE,rangeStart/rangeEnd 用 YYYY-MM-DD;只有开始日期时 rangeEnd 与之相同。",
    "4. searchQuery 给出用于联网搜索该学习主题资料的中文查询词(1-100 字)。",
    "以 today 为当日参照解析「下周」「月底」等相对表述。",
  ].join("\n");

  const lines = [`条目文字:${input.entryTitle}`, `今日:${input.today}`];
  if (input.userRangeHint !== null) {
    lines.push(`追问答复(用户对「打算学到哪天」的回答):${input.userRangeHint}`);
  }

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: lines.join("\n") },
    ],
  };
}

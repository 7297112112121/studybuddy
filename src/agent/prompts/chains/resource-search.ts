/**
 * resource-search chain(AXY-24;design 两 chain 之外的第三 chain,
 * 承载检索调用的消息构造——检索是独立 LLM 任务,prompts 三件套逐任务
 * 一文件):给 runWebSearchCompletion 提供带 deepseek_web_search 工具的
 * 检索指令。纯函数,零 IO。
 */
import type { ModelMessage } from "ai";

export const RESOURCE_SEARCH_PROMPT_VERSION = "v1";

export type ResourceSearchInput = {
  /** 条目文字原文(学习主题上下文)。 */
  entryTitle: string;
  /** 意图判定给出的建议查询词。 */
  searchQuery: string;
  /** 服务端当日,新旧的资料偏好参照。 */
  today: string;
};

export function chainResourceSearch(input: ResourceSearchInput): {
  messages: ModelMessage[];
} {
  const system = [
    "你是学习资料检索助手,任务是为一条学习日程找到真实可用的学习资料。",
    "规则:",
    "1. 使用联网搜索围绕主题检索官方文档、系统教程、优质课程,优先官方与权威来源。",
    "2. 结合条目主题与建议查询词自行发起搜索,可多次搜索直到覆盖主题核心内容。",
    "3. 汇总找到的资料:每条给出标题与 URL,并附一句话说明该资料适合学习的哪个阶段。",
    "4. 只汇报真实检索到的来源,不得编造 URL。",
  ].join("\n");

  const user = [
    `条目文字:${input.entryTitle}`,
    `建议查询词:${input.searchQuery}`,
    `今日:${input.today}`,
    "请联网检索并汇总学习资料来源。",
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
}

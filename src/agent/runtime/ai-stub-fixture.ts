/**
 * AI 测试替身 stub fixture(AXY-24 design 开放问题 #1 的假设边界):
 * 全部 stub 语料与开关判定集中本文件——`aiStubEnabled()` 仅在 env
 * `DEEPSEEK_STUB_FIXTURE=1` 时为真,生产构建默认关闭。语料按 messages
 * 关键词路由,供 E2E 固定断言(结构 + 行为口径,design 边界 #6)。
 *
 * 路由表(依 messages JSON 文本匹配,先命中先返回):
 * - 检索调用(runWebSearchCompletion):返回 3 条固定来源;含「触发AI故障」→ 不可用
 * - 结构化调用(generateStructured):
 *   - messages 含「检索来源集」(plan 调用专属标记):
 *     - 含「冷门主题」→ NOT_FOUND 语料;含「触发AI故障」→ 不可用;其余 → PLAN 语料
 *   - 其余(intent 调用):
 *     - 含「买牛奶」→ NOT_APPLICABLE;含「触发AI故障」→ 不可用
 *     - 含「追问答复」标记或日期样 token → APPLICABLE(2026-11-20 至 11-30)
 *     - 其余 → NEEDS_RANGE
 */
import type { ModelMessage } from "ai";

import type { WebSearchSource } from "./deepseek-web-search";

export function aiStubEnabled(): boolean {
  return process.env.DEEPSEEK_STUB_FIXTURE === "1";
}

const STUB_SOURCE_URLS = [
  "https://nextjs.org/docs",
  "https://nextjs.org/learn",
  "https://example.com/next-basics",
] as const;

export function stubSearchSources(): WebSearchSource[] {
  return [
    { url: STUB_SOURCE_URLS[0], title: "Next.js 官方文档", snippet: null },
    { url: STUB_SOURCE_URLS[1], title: "Next.js Learn 课程", snippet: null },
    { url: STUB_SOURCE_URLS[2], title: "Next.js 基础练习", snippet: null },
  ];
}

export type StubStructured =
  | { unavailable: true }
  | { unavailable: false; object: unknown };

/** 以服务端「今天」为锚的偏移日期(E2E 断言不随真实日历漂移)。 */
function offsetDate(offsetDays: number): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const intentNotApplicable = {
  verdict: "NOT_APPLICABLE",
  notApplicableReason: "这是日常购物事项,不需要学习资料",
  rangeStart: null,
  rangeEnd: null,
  searchQuery: "日常采购清单",
};

const intentNeedsRange = {
  verdict: "NEEDS_RANGE",
  notApplicableReason: null,
  rangeStart: null,
  rangeEnd: null,
  searchQuery: "Next.js 学习路线",
};

const intentApplicable = {
  verdict: "APPLICABLE",
  notApplicableReason: null,
  rangeStart: offsetDate(0),
  rangeEnd: offsetDate(10),
  searchQuery: "Next.js 官方教程 入门",
};

const planNotFound = {
  verdict: "NOT_FOUND",
  notFoundReason: "该主题缺少系统性的公开学习资料",
  days: [],
};

const planOk = {
  verdict: "PLAN",
  notFoundReason: null,
  days: [
    {
      date: offsetDate(1),
      text: "阅读 Next.js 官方文档基础篇",
      resources: [{ title: "Next.js 官方文档", url: STUB_SOURCE_URLS[0] }],
    },
    {
      date: offsetDate(2),
      text: "跟学 Next.js Learn 课程",
      resources: [{ title: "Next.js Learn 课程", url: STUB_SOURCE_URLS[1] }],
    },
    {
      date: offsetDate(3),
      text: "完成基础练习并搭建示例项目",
      resources: [{ title: "Next.js 基础练习", url: STUB_SOURCE_URLS[2] }],
    },
  ],
};

function messagesText(messages: ModelMessage[]): string {
  return JSON.stringify(messages);
}

export function stubStructured(messages: ModelMessage[]): StubStructured {
  const text = messagesText(messages);
  if (text.includes("触发AI故障")) {
    return { unavailable: true };
  }
  if (text.includes("检索来源集")) {
    // plan 调用
    if (text.includes("冷门主题")) {
      return { unavailable: false, object: planNotFound };
    }
    return { unavailable: false, object: planOk };
  }
  // intent 调用
  if (text.includes("买牛奶")) {
    return { unavailable: false, object: intentNotApplicable };
  }
  // 日期样 token 只认点号形态(如「11.20」):今日行是横杠 YYYY-MM-DD,
  // 不能参与命中,否则所有条目都会被判成 APPLICABLE
  if (text.includes("追问答复")) {
    // 答复「随便」→ 仍解析不出范围(E-06 语料);其余答复 → APPLICABLE
    if (text.includes("随便")) {
      return { unavailable: false, object: intentNeedsRange };
    }
    return { unavailable: false, object: intentApplicable };
  }
  // 日期样 token 只认点号形态(如「11.20」):今日行是横杠 YYYY-MM-DD,
  // 不能参与命中,否则所有条目都会被判成 APPLICABLE
  if (/\d{1,2}\.\d{1,2}/.test(text)) {
    return { unavailable: false, object: intentApplicable };
  }
  return { unavailable: false, object: intentNeedsRange };
}

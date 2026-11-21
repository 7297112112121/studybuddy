# ADR-0028：LLM 提供方采用 DeepSeek,联网检索用其声明式服务端工具

## 状态

已接受（Accepted）

## 日期

2026-11-19

## 背景

- 项目首个 AI 特性（条目 AI 资料提案）：从几个字的日程条目里读懂意图，检索真实学习资料（官方文档 / 教程），产出按天拆解的结构化提案。Q3 要求 AI 产出资料链接抽检可达率 ≥ 90%——**链接必须来自真实检索**，纯模型记忆生成的 URL 幻觉不可接受，因此联网检索是硬前提。
- 接入层已定 Vercel AI SDK（ADR-0014），其「提供商姿态」条款明确接入层与模型解耦、更换提供商只改 provider 包与 model 标识；但具体提供方未定。部署为境内单机自托管 Docker（ADR-0016），成本敏感（学生项目），服务器无稳定出境网络。
- DeepSeek 官方《联网工具》文档（2026-11 查证）：声明 `deepseek_web_search` / `deepseek_read_url` 工具即启用服务端联网搜索与网页阅读，**搜索与抓取在服务端完成，客户端不执行任何工具**；文档指定「请使用 `deepseek-flash` 模型」；服务端工具不计费（仅模型 Token 计费）。同一 API 平台另有绑定 `deepseek-v4-pro` 的通用 `web_search` 工具（英文文档），与本决策无关。
- 关键 API 约束（官方文档）：① 声明联网工具的请求**不能用结构化输出**（Messages/Responses/Chat Completions 三协议中 `text.format` / `response_format` 非 `text` 均返回 400）；② `tool_choice` 不能强制联网工具（是否搜索由模型自判，指定即 400）；③ 联网工具不可与 function 工具同时声明；④ Chat Completions 的扩展结果在 `message.server_tool_calls`，Responses 在 `web_search_call` item，引用在 `annotations.url_citation`。

## 决策

我们采用 **DeepSeek 为 LLM 提供方**：模型 `deepseek-flash`（以官方文档标识为准，联网工具指定型号），结构化调用走 AI SDK 官方 provider 包 `@ai-sdk/deepseek`（备用：`@ai-sdk/openai-compatible` 指向 `https://api.deepseek.com`，二者皆 OpenAI 兼容面）；联网检索用其声明式服务端工具 `deepseek_web_search`（含网页抓取），不经第三方搜索 API。密钥仅存服务端环境变量 `DEEPSEEK_API_KEY`（ADR-0022：应用机密零过 CI）。

调用形态为**两段式**（由上文约束 ①② 推出）：

1. **结构化调用**（意图判定 / 提案生成）：不声明联网工具，走 AI SDK `generateObject` + zod schema（ADR-0014「结构化输出」条款原样适用）；
2. **检索调用**（资料搜索）：声明 `deepseek_web_search`、自由文本作答 + 引用，因 AI SDK 抽象层尚未暴露该 DeepSeek 特有服务端工具，按 ADR-0014「逃生舱」条款精神**局部直连 DeepSeek HTTP API**（非流式，解析 `server_tool_calls` / `annotations` 提取来源与摘要），不改 AI SDK 主接入面。检索调用产出的**来源集（title + url）是提案资料的唯一合法 URL 池**——提案生成的资料 URL 由代码层强制校验 ∈ 来源集，从机制上保证链接真实可达。

## 备选方案

### 智谱 GLM / 火山方舟豆包（均含厂商内置搜索）
- 优点：同为国内直连、OpenAI 兼容、自带联网搜索，迁移成本相近。
- 缺点：无决定性优势；团队对 DeepSeek API 文档与生态更熟悉（提供方由提出者指定）。
- 否决原因：提出者指定 DeepSeek，且 DeepSeek 服务端工具不计费的成本结构对本特性（高频小请求）友好。

### Anthropic Claude（ADR-0014 默认提供方）
- 优点：模型质量最强；`@ai-sdk/anthropic` 官方维护。
- 缺点：境内自托管需稳定出境网络与海外支付；无内置搜索，须另配搜索 API。
- 否决原因：部署与支付摩擦不满足「成本敏感 + 境内单机」背景；接入层解耦姿态下 Claude 可随时经 provider 包切回，不构成锁定。

### deepseek-flash + 独立搜索 API（博查 / Tavily）
- 优点：检索可控性更强（域名过滤、深度参数），模型调用与检索解耦可各自更换。
- 缺点：多一个账号、一份密钥与一条调用链；Tavily 需出境网络。
- 否决原因：违背「零额外账号」诉求；DeepSeek 服务端工具已覆盖「搜索 + 抓取 + 引用」闭环且不计费。

### 单段式：带联网工具的请求直接输出结构化 JSON
- 优点：一次调用完成检索 + 规划。
- 缺点：官方文档明确声明联网工具时 `text.format` / `response_format` 非 `text` 返回 400，结构化输出不可用；让模型裸吐 JSON 再正则修复是脆弱面。
- 否决原因：两段式以一次廉价 flash 调用的代价换取结构化输出的类型贯通（ADR-0014 核心动机之一）。

## 后果

### 正面
- 国内直连、服务端工具零计费：检索密度不受成本约束，Q1（生成等待 p95 ≤ 15s）不受第三方搜索排队影响。
- 来源集校验机制使「链接真实可达」从提示词约定升级为代码不变量。
- 两段式每段都可独立单测：检索调用与结构化调用分别以测试替身固定输出，TDD 接缝干净。

### 负面
- 检索调用局部直连 HTTP，绕开 AI SDK 抽象：DeepSeek 响应结构（`server_tool_calls` 扩展字段）变更时需自查自修——这是 ADR-0014 逃生舱条款已知代价的延伸。
- `deepseek_web_search` 是否搜索由模型自判，检索调用存在「模型不搜」的失败模式，需在检索调用层检测（无来源返回时归一为「没找到」）。
- 模型标识 `deepseek-flash` 依官方文档，后续型号演进（如 v4.1 系列分化）需人工跟进文档，不做自动探测。

### 风险
- DeepSeek 服务可用性直接决定 R8（AI 服务不可用提示）触发频率；上线初期以人工抽检观察。
- 联网工具文档为对话场景而写，Agent 化使用（多步）未在文档承诺范围；本特性只用单轮检索调用，不越界。

## 相关决策

- [ADR-0014：LLM 接入层 Vercel AI SDK](./vercel-ai-sdk)（本决策是其「提供商姿态」与「逃生舱」条款的首次实际动用）
- [ADR-0022：CI 机密管理](./ci-secrets)（`DEEPSEEK_API_KEY` 仅存服务器环境变量）
- [ADR-0016：Docker Compose 部署](./docker-compose)（境内单机自托管背景）
- [ADR-0017：Playwright E2E](./playwright-e2e)（LLM 调用一律 mock 的测试约束）

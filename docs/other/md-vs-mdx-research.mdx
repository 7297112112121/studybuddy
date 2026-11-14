---
title: 格式调研:md 与 mdx 对 AI 输入与推理的影响
description: 调研 md 与 mdx 两种格式对 AI 输入上下文与推理理解的影响,基于 MDX 官方文档与 lobehub 仓库实证,为文档格式选型提供依据
sidebar_position: 3
---

# 格式调研:md 与 mdx 对 AI 输入与推理的影响

**调研日期**:2026-11-15 **调研对象**:MDX 官方文档(经 context7 检索)、lobehub 仓库(本地 `D:\WorkSpace\lobehub`)

**结论先行**:两种格式对 AI 的影响不对称——**读取时**差异主要是 token 噪声与语义歧义,**写入时** mdx 有真实的编译期雷区。行业与 lobehub 的实践一致收敛为同一分工:**面向 AI / 开发者的指令与规范用 `.md`,面向人类的富媒体文档站用 `.mdx`**。

## 一、外部资料:MDX 官方文档

### 1. 格式本质

MDX = CommonMark(标准 Markdown)+ JSX + ESM(`import` / `export`)+ `{表达式}`。纯 Markdown 是它的子集,因此 mdx 在兼容性上向下覆盖,但引入了自己的语法偏离。

### 2. MDX 与 Markdown 的语法偏离点

以下偏离出自 MDX 官方 `what-is-mdx` 文档。它们对 **AI 作为写入者** 影响最大,是 AI 生成技术内容时的高频翻车点:

| 偏离点 | 说明 | AI 翻车场景 |
| --- | --- | --- |
| 裸 `<`、`{` 必须转义 | 须写作 `\<`、`\{`,否则按 JSX / 表达式解析 | 泛型 `Array<string>`、数学式 `{x}`、代码内联片段——技术文档极高频 |
| 缩进代码块失效 | 4 空格缩进变成段落 | 旧式 Markdown 习惯直接失效 |
| autolink 失效 | `<https://example.com>` 与 JSX 歧义,须写 `[text](url)` | 生成链接时静默变 JSX 解析错误 |
| HTML 语法不可用 | 被 JSX 取代,`<img>` 须写 `<img />` | AI 按 CommonMark 输出 HTML 会编译失败 |
| HTML 注释不可用 | 须写 `{/* comment */}` | 注释语法完全不同 |

纯 `.md`(CommonMark + GFM)没有任何此类约束——**写入可靠性上 md 显著占优**。mdx 的错误在写入时不报错、构建(编译)时才暴露,排查成本更高。

### 3. 行业实践信号:"给 AI 看的永远是降级后的纯 Markdown"

Docusaurus 生态中存在专门插件库(如 `signalwire/docusaurus-plugins`),其功能就是**把文档站页面转换为纯 Markdown 版本并生成 `llms.txt` 索引,供 LLM 消费**。`llms.txt` 规范本身即纯 Markdown。这印证了方向:文档站给人类用 mdx,喂 AI 前先降级为 md。

## 二、lobehub 仓库实证

### 1. 分布:分工极其清晰

排除 `node_modules` 后统计,`.md` 共 391 个、`.mdx` 共 528 个:

| 后缀 | 集中位置 | 性质 |
| --- | --- | --- |
| `.md` × 391 | 根目录 `AGENTS.md` / `GEMINI.md` / `DESIGN.md`;`.agents/` 下 283 个(AI 助手流程 / 参考 / 经验文档)100% 为 md;`.claude/` 下 7 个 | 面向 AI 助手与开发者的指令、规范、知识 |
| `.mdx` × 528 | 526 个在 `docs/` 文档站(usage 234、self-hosting 154、changelog 100、development 36);`src/`、`packages/` 仅 2 个且都是测试 fixture | 面向人类读者的文档站页面 |

尤其说明问题的一组对照:`docs/development/` 下同目录并存——正式站点页用 `.mdx`(36 个),而**设计 / spec 类文档用 `.md`**(`agent-goals-design.md`、`soft-delete-recycle-bin-design.md` 等 13 个)。`AGENTS.md` 本身对 mdx 只字未提——它压根不需要。

### 2. MDX 能力的真实使用率:96% 用不上

- 526 个 docs mdx 中,**仅 20 个(3.8%)含 ESM `import`**;
- 350 个(66.5%)含大写 JSX 组件标签——这是 mdx 后缀的真实理由,但也意味着约三分之一的 mdx 连 JSX 都没有;
- 抽查 changelog mdx:纯 Markdown + frontmatter,零 JSX。后缀是**框架约定**(Docusaurus 目录统一),而非内容需要。

### 3. AI 输入管道:md 与 mdx 一视同仁,组件噪声原样进上下文

lobehub 自己的知识库管道(`src/libs/document-loaders/`)把两种后缀**完全等同**处理:

- `loaderType.ts` 将 `md` 与 `mdx` 都归入 `markdown` chunking 类型,**无任何 mdx 专属剥离逻辑**;
- 其 markdown loader 测试使用的 `demo.mdx`(借自 Drizzle 文档)包含 `import Tab from '@components/...'`、`<Callout>`、`<Tabs items={['PostgreSQL', 'MySQL', 'SQLite']}>` 等内容,断言仅是"chunk 非空"——即 import 行、JSX 标签、Tabs 多份平台变体的重复内容**全部原样进入 chunk**。

## 三、对 AI 输入上下文与推理的具体影响

### AI 作为读者(输入侧)

| 维度 | `.md` | `.mdx` |
| --- | --- | --- |
| 训练语料覆盖 | CommonMark + GFM 是模型语料中最大宗的格式,零歧义 | JSX 语法模型认识,但**组件语义未知**(组件意图全靠猜) |
| Token 效率 | 纯内容 | import 行、组件属性是纯噪声;Tabs / 变体类组件导致**同内容多份重复进上下文** |
| 推理影响 | 无 | 布局性标签(`Section`、`Tabs`)制造内容归属歧义;模型需额外一步"忽略或猜测组件语义" |

### AI 作为写入者(输出侧)

- `.md`:无语法雷区,生成可靠;
- `.mdx`:存在第一节所列编译期雷区,裸 `<`、`{` 是技术文档的日常字符,AI 需要额外的转义纪律;且 mdx 错误是编译期才暴露,写入时不报错、构建时才炸。

### 工具链

- 通用工具(全文检索、`git diff`、绝大多数渲染器、编码代理的文件读取)对 `.md` 无损;
- `.mdx` 依赖具体工具链认识它;喂给只认 Markdown 的管道时,JSX 原样透传(lobehub 实证)。

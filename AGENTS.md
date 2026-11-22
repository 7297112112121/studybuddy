# AGENTS.md

This file provides guidance to AI coding agents (e.g. Claude Code) when working with code in this repository.

## 项目概览

学习陪伴伙伴(studybuddy)Web 应用,基于 Next.js 16.4.6(App Router)+ React 19 + TypeScript(strict)技术栈构建,样式使用 Tailwind CSS 4。仓库为 npm workspaces 结构:主应用代码位于 `src/` 目录(目录约定见 `docs/dev/代码目录`),文档站点位于 `website/`(Docusaurus)。

## 常用命令

```bash
npm run dev              # 启动开发服务器(默认 http://localhost:3000)
npm run build            # 生产构建
npm run start            # 运行生产构建产物
npm run lint             # ESLint 检查(Flat Config,含 eslint-config-next/core-web-vitals 与 /typescript)
npm run test             # Vitest 单测
npm run test:integration # Vitest 集成测试(真实 PG/Redis,globalSetup 自理迁移)
npm run test:e2e         # Playwright E2E(对生产构建产物跑,webServer 自动 build && start)
npm run db:generate      # Drizzle 生成数据库迁移
npm run db:migrate       # Drizzle 应用数据库迁移
npm run dev:infra        # 启动本地基础设施(compose.dev.yaml:PostgreSQL 17 + Redis 7)
```

本地开发前置:经 `npm run dev:infra` 启动 PG/Redis(见 `compose.dev.yaml`,凭据 studybuddy/studybuddy);`.env` 从 `.env.example` 复制并填入 `BETTER_AUTH_SECRET`。CI 流水线(`.github/workflows/ci.yml`)以 services 容器提供同款 PG/Redis。

## 文档地图

每类文档的完整全景见 [docs/文档地图.md](docs/文档地图.md),本节只保留快速坐标。

- 全部文档在 `docs/`(文档站 `website/` 源目录,一律 `.md` 后缀;每页 URL 加 `.md` 即纯文本端点,全站索引见 llms.txt)。
- 产品简介在 `docs/intro.md`;研发流程总览在 `docs/研发流程.md`。
- 代码目录文件在 `docs/dev/代码目录.md`;技术选型文件目录在 `docs/dev/adr`。
- 用户故事与需求规范在 `docs/product/AXY-<N>-<slug>/`(story.md + proposal.md;编号即路径,AXY 编号由项目管理平台生成,禁止自行分配);特性开发工件(design/tasks/review)在 `docs/dev/AXY-<N>-<slug>/`。
- 通用 DoD 基线在 `.agents/skills/product_design/references/dod.md`;交互原型不入库,按 proposal 的原型契约现场生成一次性 HTML,看完即弃。
- 调研存档在 `docs/other/`;测试文档在 `docs/test/`。
- SKILL/MCP 接入提示词(新环境建 symlink 并逐项检查)在 `.agents/prompt/skill-mcp-setup.md`。
- UI 草稿工作区说明与 AI 使用约束在 [studybuddyui/README.md](studybuddyui/README.md);不对任何模块公开接口,禁止直接引用其 `components/` 与 `layouts/` 代码,消费走截图与 prompt.md。
- 项目主题色在 `src/app/globals.css`。

## Git 与版本约定

- **提交信息**:`Conventional Commits`(如 `feat:`、`fix:`、`chore:`;仓库现有提交使用中文描述)。
- **分支模型**:GitHub Flow 两段式——产品侧(创建/修订用户故事 → proposal 批准)走 `docs/<slug>` 分支,开发侧(design → plan → TDD)走 `feat/AXY-<N>-<slug>` 分支,各自完工经 PR 合并回 `master`;细则真源见 `.agents/skills/README.md`「总流程与分支生命周期」(人类侧叙述见 [docs/研发流程.md](docs/研发流程.md))。
- **版本管理**:语义化版本(SemVer),当前版本 `0.1.0`(见 `package.json`)。
- **输出语言**:面向用户的回复与提交说明使用中文。

## MCP 工具使用规则

- 当需要查询符号、调用方、被调用方或修改影响范围时,使用 codegraph 工具(codegraph_callers / codegraph_callees / codegraph_impact)。
- 当仅做模糊文本查找或读取 codegraph 返回之外的补充文件时,使用 rg / read 工具。
- 当 codegraph 已返回某文件的源码片段时,不再使用 read 工具重复读取。
- 当写 UI 需要查询组件 registry(可用组件、源码、demo)时,使用 shadcn 工具,避免凭记忆写组件 API。

## 不信任训练集

## Drizzle is NOT the Drizzle you know

本项目使用 drizzle-orm / drizzle-kit `1.0.0-rc.5`(1.0 RC,与训练数据中的 0.x 存在大量破坏性差异:API、配置约定、迁移行为均可能不同)。读写任何 Drizzle 相关内容(导入 `drizzle-orm/*` 的文件、`drizzle.config.ts`、迁移目录、drizzle-kit 命令输出)之前,先加载 `drizzle` 技能并以官方文档为准,不要凭记忆写 Drizzle 代码。

## This is NOT the AI SDK you know

The AI SDK(`ai` 包)迭代极快——API 被重命名、移除、新增,`useChat` 等 UI hooks 是变动最频繁的部分;你的训练数据几乎必然含已废弃的 API、模式与模型 ID。**任何 AI SDK 代码都不要凭记忆书写**:仓库已装 `ai-sdk` 技能,涉及 AI SDK 的工作先加载该技能;以随包安装、版本完全匹配的文档为准——`node_modules/ai/docs/` 与源码 `node_modules/ai/src/`,provider / 框架包自带文档在 `node_modules/@ai-sdk/<name>/docs/`(monorepo 中按实际 workspace 路径解析)。bundled docs 没有的内容再查 https://ai-sdk.dev/docs(页面 URL 加 `.md` 得纯文本,搜索用 `https://ai-sdk.dev/api/search-docs?q=`)。模型 ID 同样禁止凭记忆:用前先查当前模型列表。发现实装版本落后最新 major 版本时,先向用户提出升级再继续;改动完成后跑项目类型检查。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 架构与约定

- **App Router**:路由与布局都在 `src/app/` 下,根布局为 `src/app/layout.tsx`(加载 Geist 字体并注入 CSS 变量)。
- **路径别名**:`@/*` 映射到 `./src/*`(见 `tsconfig.json`)。
- 根目录的 `my-website/` 仅是开发服务器生成自签名证书时遗留的空目录,不属于项目,忽略即可。

## 研发流程与 AI 技能

特性研发遵循 [docs/研发流程.md](docs/研发流程.md) 的三阶段流程(产品设计 → 开发落地 → 测试提质),由 `.agents/skills/` 下的技能承载(`.claude/skills` 等工具目录是指向它的 symlink)。本节仅保留两道批准门与 TDD 铁律的门禁提醒(每次会话必载,作为第一触点),其余规则一律见各技能 SKILL.md,不在此重复:

- 接到新功能需求时,先读 `product-design` 技能——未经批准的用户故事不得进入开发落地。
- 产品设计按用户故事 → proposal 接力(product-design、proposal-writing,proposal 属产品侧文档);开发落地按 design → plan → TDD 实现 → spec-review 接力;两道批准门(proposal、design)未过,不得拆任务或写任何产品代码,对应技能:proposal-writing、architecture-design、plan-writing、spec-review。
- 一切产品代码遵循 TDD 铁律:无先失败的测试,即无产品代码。
- 一切 UI/前端代码遵循 [docs/dev/前端设计规范.md](docs/dev/前端设计规范.md)——组件从 `src/components/ui/`(shadcn,ADR-0004)选型,颜色/圆角/阴影一律语义 token,禁裸色值与手写平行组件;组件与主题基础见 ADR-0004/0003。
- 技术选型与既有 ADR(docs/dev/adr/)冲突或无 ADR 覆盖时,先走 ADR 流程再继续设计。

## 文档地图

每类文档的完整全景(阶段 · 产物 · 路径模式 · 产出技能 · 真源说明)见 [docs/文档地图.md](docs/文档地图.md),本节只保留快速坐标。

- 全部文档在 `docs/`(文档站 `website/` 的源目录)。格式约定:给 AI 的指令与规范一律 `.md`,面向人类的富媒体页(交互原型)一律 `.mdx`;线上每页均有纯文本 `.md` 端点,全站索引见 `https://7297112112121.github.io/studybuddy/llms.txt`。
- `docs/intro.md` — 产品简介;`docs/研发流程.md` — 三阶段流程总览(门禁见上节,不重复)。
- `docs/dev/` — 技术规范:代码目录约定(`代码目录.md`)、前端设计规范(`前端设计规范.md`,UI 落地门禁)、ADR 流程与决策日志(`docs/dev/adr/index.md`)、特性开发工件(`docs/dev/AXY-<N>-<slug>/`:design/tasks/review;proposal 在 docs/product/)。
- `docs/product/` — 产品侧文档:用户故事 `AXY-<N>-<slug>/story.md`(编号即路径,index.md 仅总览仪表盘,勿按文件名盲搜;五大组成部分)与需求规范(`AXY-<N>-<slug>/proposal.md`,含原型契约);通用 DoD 基线在 `docs/product/dod.md`。交互原型一律不入库,proposal 的「原型契约」节是原型唯一资产与 AI 唯一接口(演示态清单唯一源),需要演示时按契约现场生成一次性 HTML 看完即弃。AXY 编号由项目管理平台生成,禁止自行分配。
- `docs/other/` — 调研存档:格式调研(`md-vs-mdx-research.mdx`)、技能管理标杆、特性开发流程调研;`docs/test/` — 测试文档索引。

## Git 与版本约定

- **提交信息**:`Conventional Commits`(如 `feat:`、`fix:`、`chore:`;仓库现有提交使用中文描述)。
- **分支模型**:GitHub Flow——直接在 `master` 上开发或拉短生命周期分支,经 PR 合并回 `master`。
- **版本管理**:语义化版本(SemVer),当前版本 `0.1.0`(见 `package.json`)。
- **输出语言**:面向用户的回复与提交说明使用中文。

## 已启用的mcp服务
本项目已启用 codegraph MCP，存在 .codegraph 索引。
规则：
1. 查询符号、调用方、被调用方、修改影响范围，优先使用 codegraph 工具（codegraph_callers / codegraph_callees / codegraph_impact）
2. rg / read 仅用于模糊文本查找、读取codegraph返回之外的补充文件
3. 不要重复read codegraph已经返回源码片段的文件

本项目已启用 shadcn MCP（`.mcp.json`，无密钥、团队通用）。
用途：写 UI 前查询组件 registry（可用组件、源码、demo），避免凭记忆写组件 API；配合 docs/dev/前端设计规范.md 使用。


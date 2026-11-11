# AGENTS.md

This file provides guidance to AI coding agents (e.g. Claude Code) when working with code in this repository.

## 项目概览

学习陪伴伙伴(studybuddy)Web 应用,基于 Next.js 16.4.6(App Router)+ React 19 + TypeScript(strict)技术栈构建,样式使用 Tailwind CSS 4。仓库为 npm workspaces 结构:主应用代码位于 `app/` 目录,文档站点位于 `website/`(Docusaurus)。

## 常用命令

```bash
npm run dev      # 启动开发服务器(默认 http://localhost:3000)
npm run build    # 生产构建
npm run start    # 运行生产构建产物
npm run lint     # ESLint 检查(Flat Config,含 eslint-config-next/core-web-vitals 与 /typescript)
```

尚未安装测试框架;无独立的后端/数据库服务。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

已观察到的差异实例(不要凭旧版知识假设 API):

- 布局组件使用全局类型 `LayoutProps<"/">`(见 `app/layout.tsx`),而非手写 `children: React.ReactNode`。
- `next.config.ts` 中启用了 `cacheComponents: true` 与 `partialPrefetching: true`,缓存/数据获取语义与旧版不同。
- Tailwind CSS 4 通过 `next.config.ts` 的 `turbopack.rules` 接入(`@tailwindcss/turbopack`),**没有** `tailwind.config` 或 `postcss.config`;主题变量在 `app/globals.css` 的 `@theme inline` 中定义,暗色模式基于 `prefers-color-scheme`。

## 架构与约定

- **App Router**:路由与布局都在 `app/` 下,根布局为 `app/layout.tsx`(加载 Geist 字体并注入 CSS 变量)。
- **路径别名**:`@/*` 映射到项目根目录(见 `tsconfig.json`)。
- 根目录的 `my-website/` 仅是开发服务器生成自签名证书时遗留的空目录,不属于项目,忽略即可。

## Git 与版本约定

- **提交信息**:`Conventional Commits`(如 `feat:`、`fix:`、`chore:`;仓库现有提交使用中文描述)。
- **分支模型**:GitHub Flow——直接在 `master` 上开发或拉短生命周期分支,经 PR 合并回 `master`。
- **版本管理**:语义化版本(SemVer),当前版本 `0.1.0`(见 `package.json`)。
- **输出语言**:面向用户的回复与提交说明使用中文。

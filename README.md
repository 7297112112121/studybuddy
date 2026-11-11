# 学习陪伴伙伴(studybuddy)

面向纯软件赛道、有就业 / 深造需求的本科在校大学生的 AI 一体化学业与生涯陪伴平台。产品定位为「面向 IT 垂直赛道的个性化、有情感的 AI 学习成长伙伴」,围绕「垂直赛道规划 → 动态任务调度 → 全流程情绪陪伴 → 落地执行采集」形成闭环,解决传统学习规划工具静态固化、垂直指导缺失、过程陪伴不足的核心问题。

**核心能力:**

- **AI 学业规划** — 垂直 IT 赛道的生涯路线设计、里程碑规划与动态调整
- **情绪陪伴** — 学习过程中的情绪疏导、动力干预与成长激励
- **技能实训** — IT 方向课内学习、刷题、项目实战等落地练习场景

> 本期不对接企业 HR 招聘系统与高校教务系统,不提供真人老师一对一辅导服务,保障核心能力聚焦。

技术上基于 [Next.js](https://nextjs.org) 构建,仓库采用 npm workspaces 结构:主应用位于 `app/`,文档站点位于 `website/`(Docusaurus,通过 GitHub Actions 自动发布到 GitHub Pages)。

## 快速开始

以下步骤可让你在本地跑起一份用于开发与测试的副本。部署到线上环境见 [部署](#部署)。

### 环境要求

- [Node.js](https://nodejs.org) ≥ 20(建议 LTS 版本)
- npm(随 Node 附带;仓库使用 npm workspaces,请勿混用 pnpm / yarn)

### 安装

克隆仓库并安装依赖(根目录一次装好所有 workspace):

```bash
git clone https://github.com/7297112112121/studybuddy.git
cd studybuddy
npm install
```

启动主应用(开发模式,默认 <http://localhost:3000>):

```bash
npm run dev
```

启动文档站点(Docusaurus 开发模式):

```bash
npm run docs:dev
```

其他常用命令:

```bash
npm run build        # 生产构建主应用
npm run start        # 运行生产构建产物
npm run lint         # ESLint 检查
npm run docs:build   # 构建文档站点
npm run docs:serve   # 本地预览文档站点构建产物
```

## 运行测试

项目尚未引入测试框架(后续计划见仓库进展)。当前阶段使用 ESLint 做代码质量检查:

```bash
npm run lint
```

## 部署

- **主应用**:任意支持 Next.js 的平台均可,生产构建与启动:
  ```bash
  npm run build
  npm run start
  ```
- **文档站点**:推送到 `master` 且改动涉及 `website/**`、`package.json`、`package-lock.json` 或工作流文件时,`.github/workflows/docs.yml` 会自动构建并发布到 GitHub Pages:<https://7297112112121.github.io/studybuddy/>(需在仓库 Settings → Pages 中将 Source 设为 "GitHub Actions")。

## 技术栈

- [Next.js](https://nextjs.org) 16 — Web 框架(App Router)
- [React](https://react.dev) 19 — UI 库
- [TypeScript](https://www.typescriptlang.org)(strict 模式)
- [Tailwind CSS](https://tailwindcss.com) 4 — 样式
- [Docusaurus](https://docusaurus.io) 3 — 文档站点

## 参与贡献

欢迎提交 Issue 与 Pull Request!流程遵循 GitHub Flow:在 `master` 上开发或拉取短生命周期分支,经 PR 合并回 `master`。提交信息请遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范(如 `feat:`、`fix:`、`chore:`),描述使用中文。

面向 AI 编码代理的开发指引见 [AGENTS.md](AGENTS.md)。

## 版本管理

项目使用 [SemVer](https://semver.org/lang/zh-CN/) 语义化版本,当前版本 `0.1.0`(见 `package.json`)。可用版本参见仓库的 [tags](https://github.com/7297112112121/studybuddy/tags)。

## 作者

- **海渝**([@7297112112121](https://github.com/7297112112121)) — 初始开发

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 授权许可。

## 致谢

- [README 模板](https://gist.github.com/PurpleBooth/109311bb0361f32d87a2) — PurpleBooth
- [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) 与 [create-docusaurus](https://docusaurus.io/docs/installation) 脚手架

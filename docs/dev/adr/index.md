---
title: 技术选型（ADR）
description: 学习陪伴伙伴的架构决策记录（ADR）索引
sidebar_position: 1
---

# 技术选型（ADR）

## 决策日志

| 编号 | 日期 | 决策 | 状态 |
| --- | --- | --- | --- |
| [0001](nextjs-fullstack-framework) | 2026-11-12 | 全栈框架：Next.js 16 | 已接受 |
| [0002](app-router) | 2026-11-12 | 路由：App Router | 已接受 |
| [0003](tailwindcss-4) | 2026-11-12 | 样式方案：Tailwind CSS 4 | 已接受 |
| [0004](shadcn-ui) | 2026-11-12 | 组件基础：shadcn/ui | 已接受 |
| [0005](postgresql-pgvector) | 2026-11-12 | 数据库：PostgreSQL 17 + pgvector | 已接受 |
| [0006](drizzle-orm) | 2026-11-12 | ORM：Drizzle ORM | 已接受 |
| [0007](redis) | 2026-11-12 | 缓存与临时态：Redis | 已接受 |
| [0009](zustand) | 2026-11-12 | 客户端状态：zustand | 已接受 |
| [0010](i18n) | 2026-11-12 | 国际化：next-intl（原提案 react-i18next） | 已接受 |
| [0011](eslint-prettier) | 2026-11-12 | 代码规范：ESLint + Prettier | 已接受 |
| [0012](vitest) | 2026-11-12 | 单元测试：Vitest | 已接受 |
| [0013](better-auth) | 2026-11-12 | 认证与会话：Better Auth（原提案 Auth.js / Clerk / 自建） | 已接受 |
| [0015](seaweedfs) | 2026-11-12 | 对象存储：SeaweedFS（原提案 RustFS / MinIO 替代方案） | 已接受 |
| [0016](docker-compose) | 2026-11-12 | 部署编排：Docker Compose 单机自托管 | 已接受 |
| [0017](playwright-e2e) | 2026-11-12 | E2E 测试：Playwright（补 ADR-0012 异步 RSC 盲区） | 已接受 |
| [0018](cicd-github-actions) | 2026-11-12 | CI/CD 流水线：GitHub Actions（生产 tag + required reviewers 放行；触发晋升与三环境映射） | 已接受 |
| [0020](tencent-tcr-registry) | 2026-11-12 | 镜像仓库：腾讯云 TCR 个人版（tag = 短 SHA + semver） | 已接受 |
| [0021](trivy-dependabot) | 2026-11-12 | 安全扫描：Trivy 镜像门禁 + Dependabot 依赖监听（每周 scheduled 复扫） | 已接受 |
| [0022](ci-secrets) | 2026-11-12 | CI 机密管理：分环境隔离与三层分界（应用机密零过 CI） | 已接受 |
| [0025](client-data-layer) | 2026-11-23 | 客户端数据层：Route Handler + Server Actions | 已接受 |
| [0026](ci-path-filtering) | 2026-11-19 | CI 按变更路径裁剪：dorny/paths-filter（PR 层 + push master 层 job 级裁剪，兜底式全跑；修订 0022 白名单条款） | 已接受 |
| [0028](deepseek-provider-web-search) | 2026-11-19 | LLM 提供方：DeepSeek（deepseek-flash）+ 声明式服务端联网工具，结构化与检索两段式调用（项目首个 AI 特性） | 已接受 |
| [0029](agentscope) | 2026-11-23 | AI 服务框架：AgentScope 2.0（ReAct 循环/工具技能/长期记忆/多用户隔离内建，DeepSeek 一等支持） | 已接受 |
| [0030](sse-streaming) | 2026-11-23 | AI 流式链路：SSE 全链（Agent Service 会话流 → Next Route Handler 加工 → 前端打字机；不引入 WebSocket/gRPC） | 已接受 |
| [0031](ai-sdk-ui) | 2026-11-23 | AI UI 流式渲染：AI SDK（useChat + message parts 生成式 UI，transport 指向自有 Route Handler；不引入第二套聊天组件库） | 已接受 |

## 现行技术栈速查

| ADR | 技术 | 硬约束（设计必须遵守） | 需回读全文的信号 |
| --- | --- | --- | --- |
| [0001](nextjs-fullstack-framework) | Next.js 16 | 实现细节以 `node_modules/next/dist/docs` 为准，不信训练记忆；cacheComponents 已启用 | 用到 Next 16 新 API 或缓存 / PPR 语义时 |
| [0002](app-router) | App Router | 请求级介入用 proxy.ts（仅 Node runtime），不是 middleware | 异步 params 或迁移 middleware 方案时 |
| [0003](tailwindcss-4) | Tailwind CSS 4 | 新增颜色 / 间距 / 圆角必须先进 `globals.css` 的 `@theme` 变量 | 手动切换暗色模式时 |
| [0004](shadcn-ui) | shadcn/ui | 组件源码复制进仓库，不整体升级、只按需 diff 上游 | 新增组件或同步上游时 |
| [0005](postgresql-pgvector) | PostgreSQL 17 + pgvector | 不引入独立向量库，向量与业务数据同库同事务 | 检索规模逼近百万级时 |
| [0006](drizzle-orm) | Drizzle ORM | 迁移经 drizzle-kit 生成 SQL 入库评审，禁手改 | rename 等破坏性变更需核对 SQL 时 |
| [0007](redis) | Redis 7 | 只存可重建 / 可过期数据，持久化事实以 PG 为准 | 涉队列、过期或可否丢失的判断时 |
| [0009](zustand) | zustand v5 | 服务端数据不进 store，持久偏好走 URL / localStorage | 拆分 store 切片或高频状态时 |
| [0010](i18n) | next-intl | 单语言无路由前缀，缓存键必须含语言维度防串语言 | 需迁 `[lang]` 前缀或升级 Next 时 |
| [0011](eslint-prettier) | ESLint + Prettier | 格式全归 Prettier，ESLint 关格式类规则，CI 分步检查 | 引新 lint 工具或规则冲突时 |
| [0012](vitest) | Vitest | 异步 Server Components 不做单测，留 E2E 补位 | mock next/* 或测 RSC 时 |
| [0013](better-auth) | Better Auth | 会话 / 用户表落自有 PG（drizzleAdapter 同库迁移），守卫经 `auth.api.getSession` | 启新插件或改安全配置时 |
| [0015](seaweedfs) | SeaweedFS | 只走 S3 兼容 API + 预签名直传，内部端口仅绑内网 | 需高级 S3 特性（加密 / 对象锁）时 |
| [0016](docker-compose) | Docker Compose | 镜像钉版本禁 latest，应用服务保持无状态 | 多机扩容或反向代理选型时 |
| [0017](playwright-e2e) | Playwright | 只测关键旅程，LLM 调用一律 mock，对生产构建跑 | cacheComponents 导航断言或独立测试库时 |
| [0018](cicd-github-actions) | GitHub Actions | PR 作业零机密不部署；生产仅 v* tag 触发 + 人工放行 | 改流水线触发或部署通道时 |
| [0020](tencent-tcr-registry) | 腾讯云 TCR | 镜像 tag = 短 SHA，发版附加 semver | 配额受限或需内网拉取时 |
| [0021](trivy-dependabot) | Trivy + Dependabot | 推送前 Trivy 阻断 HIGH/CRITICAL，豁免须注明原因 | 需豁免漏洞或改扫描面时 |
| [0022](ci-secrets) | CI 机密管理 | 应用运行时机密零过 CI 只存服务器；action 钉完整 SHA；个人组织 action 例外须显式 ADR 评审 | 新增 CI 机密或引第三方 action 时 |
| [0026](ci-path-filtering) | dorny/paths-filter | PR 层与 push master 层裁剪；未命中显式跳过清单一律全跑（deploy 层跳过仅限镜像产物无差异清单），filter 与 .github/** 变更强制全跑 | 改 CI 触发面、新增顶层目录或升级该 action 时 |
| [0025](client-data-layer) | Route Handler + Server Actions | 错误经判别联合返回不抛裸异常；首屏数据走 RSC 直读；客户端查询与轮询走 Route Handler | 需乐观更新编排、客户端缓存/去重或对 Server Actions 串行分发有疑虑时 |
| [0029](agentscope) | AgentScope 2.0 | 模型接入一律经 Credential 配置切换，禁止代码硬编码提供方；版本钉 2.x minor，跨 minor 升级先核对 breaking change；用户隔离对接 Better Auth 会话，AI 侧不另建身份体系 | 启用新 Toolkit/Context 能力、对接 pgvector 记忆或跨 minor 升级时 |
| [0030](sse-streaming) | SSE 全链 | python 侧用 Agent Service 会话事件流不自建协议；Next Route Handler 关闭代理缓冲；用户输入走普通 POST 不经流通道；双向实时需求出现时另立 ADR 不改造本通道 | 调通中转层缓冲/背压、前端重连续流或评估实时通道时 |
| [0031](ai-sdk-ui) | AI SDK | AI SDK 代码以随包安装、版本完全匹配的文档与源码为真源，禁止凭训练记忆书写；transport 指向自有 Route Handler，不用自带服务端实现；版本钉 minor，major 升级逐次评估；不引入第二套聊天组件库 | 写 AI SDK 代码、升级 major 或新增消息部件类型时 |

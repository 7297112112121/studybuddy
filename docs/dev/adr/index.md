---
title: 技术选型（ADR）
description: 学习陪伴伙伴的架构决策记录（ADR）——流程约定、决策日志与待决策清单
sidebar_position: 1
---

# 技术选型（ADR）

ADR（Architecture Decision Record，架构决策记录）是一份只记录**一个**决策的短文档，回答四个问题：**背景是什么、决定了什么、考虑过哪些替代方案、带来什么后果**。代码展示「做了什么」，ADR 保存「为什么这样做」。模板与流程参考 [Architecture Decision Records: The Complete Guide](https://www.archyl.com/blog/architecture-decision-records-complete-guide)。

## 约定

- **存储**：ADR 统一放在 `docs/dev/adr/`，与代码同仓库版本化管理，随 PR 走评审。
- **粒度**：一个 ADR 只写一个决策；一页以内写不下说明拆分成了多个决策。
- **命名**：`NNNN-英文短横线标题.md`，编号顺序递增、永不复用。
- **生命周期**：提议中（Proposed）→ 已接受（Accepted）→（已取代 Superseded / 已废弃 Deprecated）。决策被取代时**旧 ADR 不删除**，仅改状态并由新 ADR 回链。
- **回顾**：每季度检查一次既有 ADR 的假设是否失效。
- **PR 检查**：涉及架构影响的 PR 需附「架构影响」说明：无变更，或附 ADR 链接。

## 模板

```markdown
# ADR-NNNN：一句话标题

## 状态
提议中（Proposed）| 已接受（Accepted）| 已取代（Superseded by ADR-XXXX）

## 日期
YYYY-MM-DD

## 背景
问题、约束、团队与规模等事实。

## 决策
明确、主动语态的结论（「我们采用 X」，不是「建议考虑 X」）。

## 备选方案
逐个列出：优点 / 缺点 / 否决原因。

## 后果
正面 / 负面 / 风险。承认代价是 ADR 的诚信所在。

## 相关决策
关联 ADR 编号。
```

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
| [0008](trpc) | 2026-11-12 | API 层：tRPC | 已取代（[0025](client-data-layer)） |
| [0009](zustand) | 2026-11-12 | 客户端状态：zustand | 已接受 |
| [0010](i18n) | 2026-11-12 | 国际化：next-intl（原提案 react-i18next） | 已接受 |
| [0011](eslint-prettier) | 2026-11-12 | 代码规范：ESLint + Prettier | 已接受 |
| [0012](vitest) | 2026-11-12 | 单元测试：Vitest | 已接受 |
| [0013](better-auth) | 2026-11-12 | 认证与会话：Better Auth（原提案 Auth.js / Clerk / 自建） | 已接受 |
| [0014](vercel-ai-sdk) | 2026-11-12 | LLM 接入层：Vercel AI SDK（原提案 LangChain / LlamaIndex / 自建网关） | 已接受 |
| [0015](seaweedfs) | 2026-11-12 | 对象存储：SeaweedFS（原提案 RustFS / MinIO 替代方案） | 已接受 |
| [0016](docker-compose) | 2026-11-12 | 部署编排：Docker Compose 单机自托管 | 已接受 |
| [0017](playwright-e2e) | 2026-11-12 | E2E 测试：Playwright（补 ADR-0012 异步 RSC 盲区） | 已接受 |
| [0018](cicd-github-actions) | 2026-11-12 | CI/CD 流水线：GitHub Actions（生产 tag + required reviewers 放行；触发晋升与三环境映射） | 已接受 |
| [0019](observability-grafana-stack) | 2026-11-12 | 可观测性后端：Grafana 栈（Prometheus/Loki/Tempo/Grafana/Alloy） | 已接受 |
| [0020](tencent-tcr-registry) | 2026-11-12 | 镜像仓库：腾讯云 TCR 个人版（tag = 短 SHA + semver） | 已接受 |
| [0021](trivy-dependabot) | 2026-11-12 | 安全扫描：Trivy 镜像门禁 + Dependabot 依赖监听（每周 scheduled 复扫） | 已接受 |
| [0022](ci-secrets) | 2026-11-12 | CI 机密管理：分环境隔离与三层分界（应用机密零过 CI） | 已接受 |
| [0023](error-reporting-glitchtip) | 2026-11-12 | 错误上报：GlitchTip（Sentry SDK 兼容自托管） | 已接受 |
| [0024](telemetry-opentelemetry) | 2026-11-12 | 采集层：OpenTelemetry 标准（Next.js instrumentation + AI SDK 遥测） | 已接受 |
| [0025](client-data-layer) | 2026-11-13 | 客户端数据层：TanStack Query + Server Actions（取代 ADR-0008 的 tRPC） | 已接受 |
| [0026](ci-path-filtering) | 2026-11-19 | CI 按变更路径裁剪：dorny/paths-filter（PR 层 + push master 层 job 级裁剪，兜底式全跑；修订 0022 白名单条款） | 已接受 |

## 现行技术栈速查

给架构设计期（architecture-design 第 2 步）主会话**内联核对**用：设计技术要点逐条对照本表，能判定的「一致 / 冲突」直接写进 design 的 adr.md；「需回读全文的信号」命中时才打开对应 ADR 原文。已取代的 ADR（0008）不列。新 ADR 接受时随同一 PR 在本表登记一行，并同步提炼硬约束。

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
| [0014](vercel-ai-sdk) | Vercel AI SDK | 流式对话走 Route Handler，消息按 UIMessage 结构落库 | Anthropic 特有能力或新模型适配时 |
| [0015](seaweedfs) | SeaweedFS | 只走 S3 兼容 API + 预签名直传，内部端口仅绑内网 | 需高级 S3 特性（加密 / 对象锁）时 |
| [0016](docker-compose) | Docker Compose | 镜像钉版本禁 latest，应用服务保持无状态 | 多机扩容或反向代理选型时 |
| [0017](playwright-e2e) | Playwright | 只测关键旅程，LLM 调用一律 mock，对生产构建跑 | cacheComponents 导航断言或独立测试库时 |
| [0018](cicd-github-actions) | GitHub Actions | PR 作业零机密不部署；生产仅 v* tag 触发 + 人工放行 | 改流水线触发或部署通道时 |
| [0019](observability-grafana-stack) | Grafana 栈 | 观测栈独立部署勿与生产同机；日志 7 天 / 指标 30 天 | 调资源限额或告警规则时 |
| [0020](tencent-tcr-registry) | 腾讯云 TCR | 镜像 tag = 短 SHA，发版附加 semver | 配额受限或需内网拉取时 |
| [0021](trivy-dependabot) | Trivy + Dependabot | 推送前 Trivy 阻断 HIGH/CRITICAL，豁免须注明原因 | 需豁免漏洞或改扫描面时 |
| [0022](ci-secrets) | CI 机密管理 | 应用运行时机密零过 CI 只存服务器；action 钉完整 SHA；个人组织 action 例外须显式 ADR 评审 | 新增 CI 机密或引第三方 action 时 |
| [0026](ci-path-filtering) | dorny/paths-filter | PR 层与 push master 层裁剪；未命中显式跳过清单一律全跑（deploy 层跳过仅限镜像产物无差异清单），filter 与 .github/** 变更强制全跑 | 改 CI 触发面、新增顶层目录或升级该 action 时 |
| [0023](error-reporting-glitchtip) | GlitchTip | SDK = @sentry/nextjs，DSN 指自托管 | 升级 SDK 或遇协议缝隙时 |
| [0024](telemetry-opentelemetry) | OpenTelemetry | OTel 唯一埋点；涉敏链路关 recordInputs/Outputs | 新增采集点或涉敏链路决策时 |
| [0025](client-data-layer) | TanStack Query + Server Actions | 错误经判别联合返回不抛裸异常；首屏数据走 RSC 直读 | 并行分发、乐观更新或 GET 缓存语义时 |

## 待决策清单

本轮选型清单（0001–0024）已全部完成；0020–0022 由 ADR-0018 拆分而来，0023–0024 由 ADR-0019 拆分而来（2026-11-13）。0025 是首次选型复盘的产物：以 TanStack Query + Server Actions 取代 ADR-0008 的 tRPC（2026-11-13）。0026 是 CI 流程裁剪决策：dorny/paths-filter 引入 PR 校验与 push master 部署两条流水线，并修订 ADR-0022 的 action 白名单条款（2026-11-19，已接受；实施另行开工）。后续出现新决策时按同一模板新增 ADR 并登记于决策日志。

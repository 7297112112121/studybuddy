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
| [0025](client-data-layer) | 2026-11-23 | 客户端数据层：Route Handler + Server Actions | 已取代（2026） |
| [0026](ci-path-filtering) | 2026-11-19 | CI 按变更路径裁剪：dorny/paths-filter（PR 层 + push master 层 job 级裁剪，兜底式全跑；修订 0022 白名单条款） | 已接受 |
| [0029](agentscope) | 2026-11-23 | AI 服务框架：AgentScope 2.0（ReAct 循环/工具技能/长期记忆/多用户隔离内建，DeepSeek 一等支持） | 已接受 |
| [0030](sse-streaming) | 2026-11-23 | AI 流式链路：SSE 全链（Agent Service 会话流 → Next Route Handler 加工 → 前端打字机；不引入 WebSocket/gRPC） | 已接受 |
| [0031](ai-sdk-ui) | 2026-11-23 | AI UI 流式渲染：AI SDK（useChat + message parts 生成式 UI，transport 指向自有 Route Handler；不引入第二套聊天组件库） | 已接受 |
| [0032](agent-memory-mem0-pgvector) | 2026-11-23 | AI 长期记忆：Mem0 OSS + pgvector 落自有 PostgreSQL（条款级修订：修订记忆方案条款——mem0 后端替代向量记忆自对接预期） | 已接受 |
| [0033](store-centric-data-layer) | 2026-11-24 | 客户端数据层：store 居中 + 统一 HTTP 接口（取代 0025；修订 0009 条款——服务端数据入 store） | 已接受 |
| [0034](ai-persistence-boundary) | 2026-11-24 | AI 服务持久化边界：python 服务无持久层，持久化归 Next 业务逻辑层（修订 0029/0032 条款） | 已接受 |
| [0035](pino-logging) | 2026-11-25 | 服务端日志：pino（JSON 行写 stdout；技术报错归一前留痕；客户端不引入） | 已接受 |
| [0036](unit-test-coverage) | 2026-11-28 | 单测覆盖率：Vitest v8 provider（钉同版本；分母 src/** 减白名单；Job Summary 内嵌零外发；只报告不设阈值） | 已接受 |
| [0037](mutation-testing) | 2026-11-28 | 变异测试：StrykerJS（vitest-runner 版本互钉；CI 独立 job；Job Summary 零外发） | 已接受 |

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
| [0009](zustand) | zustand v5 | store 承载 UI 态与服务端数据客户端持有层，写入经统一接口；持久偏好走 URL / localStorage | 拆分 store 切片或处理失效编排时 |
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
| [0033](store-centric-data-layer) | store 居中数据层 | 业务组件只订阅 store，全部读写经统一接口（自写 Route Handler）进出，RSC 不直读服务层；错误经判别联合返回不抛裸异常；不引入 TanStack Query/SWR | 对接新业务域读写、处理 store 失效编排或评估客户端缓存库时 |
| [0029](agentscope) | AgentScope 2.0 | 模型接入一律经 Credential 配置切换，禁止代码硬编码提供方；版本钉 2.x minor，跨 minor 升级先核对 breaking change；用户隔离对接 Better Auth 会话，AI 侧不另建身份体系 | 启用新 Toolkit/Context 能力、更换记忆中间件或跨 minor 升级时 |
| [0030](sse-streaming) | SSE 全链 | python 侧用 Agent Service 会话事件流不自建协议；Next Route Handler 关闭代理缓冲；用户输入走普通 POST 不经流通道；双向实时需求出现时另立 ADR 不改造本通道 | 调通中转层缓冲/背压、前端重连续流或评估实时通道时 |
| [0031](ai-sdk-ui) | AI SDK | AI SDK 代码以随包安装、版本完全匹配的文档与源码为真源，禁止凭训练记忆书写；transport 指向自有 Route Handler，不用自带服务端实现；版本钉 minor，major 升级逐次评估；不引入第二套聊天组件库 | 写 AI SDK 代码、升级 major 或新增消息部件类型时 |
| [0032](agent-memory-mem0-pgvector) | AgentScope 记忆：Mem0 OSS | 记忆经内建 Mem0Middleware 承载 mem0 OSS 计算引擎，向量与历史存取经 Next 内网 API 落自有 PostgreSQL（python 无持久层）；不用托管平台，不引 ReMe/文件式与独立向量库；embedding 用智谱 Embedding-3（经 OpenAI 兼容端点，凭据走环境变量） | 记忆抽取/检索质量不足、存储适配层覆盖面存疑或 mem0 依赖升级时 |
| [0035](pino-logging) | pino | 服务端留痕唯一载体：JSON 行写 stdout，级别经 LOG_LEVEL 调节；不启用 transport/pretty；客户端留痕仍 console.error | 改日志形态、接观测平台或日志收集时 |
| [0036](unit-test-coverage) | Vitest coverage-v8 | provider 与 vitest 钉同版本；指标零外发；升级 vitest 必须同步升级 provider | 改覆盖率配置或升级 vitest 时 |
| [0037](mutation-testing) | StrykerJS | core 与 vitest-runner 版本互钉；只跑单测轨；报告零外发；升级 vitest 须核对兼容矩阵 | 落地/调整变异 job 或升级 Stryker/vitest 时 |

---
title: ADR-0013：认证与会话采用 Better Auth
description: better-auth 1.7，Drizzle/Redis 一手集成，用户与会话数据留在自有 PostgreSQL，插件化覆盖 2FA/组织/魔术链接
---

# ADR-0013：认证与会话采用 Better Auth

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 技术栈已定为 Next.js 16 App Router + PostgreSQL/Drizzle + Redis + tRPC（ADR-0001/0005/0006/0007/0008；tRPC 后被 ADR-0025 取代）。认证方案要和这四件东西都低摩擦集成：RSC 里取会话、会话表与业务表同库同迁移、缓存与限流走 Redis、鉴权结果注入 tRPC context（取代后改为服务端函数内直接调用，见决策条目）。
- 产品是 AI 学习陪伴应用，对话与学习记录涉及用户敏感情绪内容：用户与会话数据必须留在自有数据库（ADR-0005 已确立数据自持与自托管），排除数据面托管在第三方 SaaS 的方案。
- 面向个人学习者的 MVP：邮箱密码 + 主流 OAuth 起步，后续可能需要 2FA、多会话、组织/家庭共学等能力，希望按需打开而非二次开发。
- TypeScript strict：会话与用户类型要贯通到 tRPC 与 RSC，不接受 `any` 断言式接入。

## 决策

认证与会话采用 better-auth（v1.x，MIT）：

- 服务端实例经内置 drizzleAdapter 直接使用 ADR-0006 的 Drizzle schema：user/session/account/verification 表与业务数据同库，由 drizzle-kit 统一迁移。
- App Router 以 catch-all 路由挂载认证端点（官方 Next.js 集成）；服务端组件与中间件从中取会话做鉴权。
- 客户端登录 UI 由官方客户端 SDK 驱动；服务端鉴权统一在 RSC 与 Server Action 内经 `auth.api.getSession` 直接调用，未登录按各自入口拒绝（原为注入 tRPC context、走受保护 procedure，tRPC 被 ADR-0025 取代后修订，2026-11-13）。
- 会话缓存与限流计数走 secondaryStorage，接官方 Redis 存储实现（ADR-0007）。
- 2FA、魔术链接、组织、API Key 等能力按插件按需启用，不默认全开。
- 版本策略：锁 minor；安全通告的补丁版本按事件响应即时跟进（见风险）。

## 备选方案

### Auth.js / NextAuth v5
- 优点：与 Next.js 同一团队维护，事实上的官方默认；JWT 会话策略可免查库；历史社区积累深厚（GitHub 28,377 stars）。
- 缺点：v5 发布两年多仍未转正（npm dist-tags：`latest` = 4.24.15，`beta` = 5.0.0-beta.32，2026-11 查证），长期 beta 意味着 API 兼容承诺弱；数据库会话的适配器生态、2FA/组织等高级能力弱于 Better Auth，大量功能需自建或拼社区包。
- 否决原因：把安全关键域压在 beta 分支上不可接受；数据库会话 + Drizzle + tRPC 的整合在 Better Auth 是一手支持。

### Clerk
- 优点：托管体验最好，预置登录/注册 UI 与用户管理后台，接入最快（`@clerk/nextjs` 周下载 359 万）。
- 缺点：商业 SaaS 按 MAU 计费；用户与会话数据存于第三方，与自托管、敏感数据不出域的约束直接冲突；供应商锁定随用户量增长。
- 否决原因：数据自主权优先级高于接入速度。

### Lucia
- 优点：「薄库」哲学的代表，源码可读、心智负担小，曾是自建派首选。
- 缺点：2025-03 已被作者宣布废弃（仓库 README："Lucia was deprecated on March 2025"），仅提供单文件 `auth_session.ts` 作为替代；仓库近月无实质提交。
- 否决原因：不再维护，新项目不可选。其教程级源码仍可留作团队学习材料。

### 完全自建
- 优点：无外部依赖，完全可控；会话 CRUD 本身代码量不大。
- 缺点：认证是安全关键域——CSRF、会话固定、时序攻击、凭证填充、OAuth 细节每个坑都要自己踩，CVE 响应只剩自己；Lucia 作者的退役公告印证了这条路线的长期维护成本。
- 否决原因：不为省一个成熟依赖承担整条安全链路的自证责任。

## 后果

### 正面
- 与既有栈零阻抗：`@better-auth/drizzle-adapter` 的 peerDeps 覆盖 drizzle-orm `^0.45.2 || 1.x`；RSC 取会话、tRPC 注入、Redis secondaryStorage 均有官方文档与代码样例（context7 索引官方文档代码片段 6,000+）。
- 社区动能已过临界点：下载量、star 数与提交活跃度均已反超 next-auth（具体数据见备选方案与参考资料），生态位已从挑战者转为主导者。
- 功能覆盖产品全生命周期：邮箱密码、OAuth、2FA、魔术链接、组织、API Key、匿名会话全部插件化；加密基座为 jose + @noble/hashes/@noble/ciphers，不造加密轮子。
- 数据留在自有 PG：schema 与业务表一起评审、迁移与备份，满足敏感数据不出域；迁移路径始终清晰，不构成锁定。

### 负面
- 发布节奏极快（本 ADR 撰写当天上游仍在发布 1.7.22），minor 升级需跑全量回归；Drizzle v1 适配也在演进（relations-v2 适配器随上游变动），存在持续跟进成本。
- 安全披露密度高：OSV.dev 累计 26 条 GHSA 通告（2024-05 发布至今），含账户接管、XSS、开放重定向、2FA 绕过等，均有对应修复版本；作为对照，运营约六年的 next-auth 累计 14 条。披露透明是好事，但说明其安全面正在被实战高频检验，「通告 → 升级」必须成为常规流程而非偶发动作。
- 教程与 Stack Overflow 存量少于 NextAuth，排错更依赖官方文档与 GitHub issues。

### 风险
- 版本漂移：锁 minor + 补丁即时跟进；CI 每周跑 `npm audit` 与 OSV 扫描，把 better-auth 列为重点监听对象。
- 上游失效（低概率）：数据与 schema 始终在自有 PG，真到那一天可迁移到 Auth.js v5 转正版，或参照 Lucia 遗留的单文件会话模式（自持 schema、无运行时依赖）自建，回退成本可控。
- 配置失误：历史上多条通告与默认/示例配置相关（如 `session.cookieCache` 过早缓存导致 2FA 绕过）。上线前对 trustedOrigins、2FA、限流、cookie 域等开关逐项评审，配置变更纳入 code review 清单。

## 相关决策

- [ADR-0005：PostgreSQL 17 + pgvector](./postgresql-pgvector)
- [ADR-0006：Drizzle ORM](./drizzle-orm)
- [ADR-0007：Redis](./redis)
- [ADR-0025：客户端数据层 TanStack Query + Server Actions](./client-data-layer)（鉴权注入点随其取代 tRPC 而修订）
- [ADR-0012：Vitest 单元测试](./vitest)

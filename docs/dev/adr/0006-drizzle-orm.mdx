---
title: ADR-0006：ORM 采用 Drizzle ORM
description: drizzle-orm + drizzle-kit，SQL 直译心智、轻量运行时、pgvector 官方支持
---

# ADR-0006：ORM 采用 Drizzle ORM

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- TypeScript strict 全栈，需要「表结构 → 查询 → API → UI」全程类型贯通。
- pgvector 列（`vector` 类型）、JSONB、数组等 PostgreSQL 特有能力需要在 ORM 层可用（ADR-0005）。
- 服务端组件直连数据库（ADR-0001），ORM 的运行时体积与冷启动成本影响每次渲染。

## 决策

采用 drizzle-orm + drizzle-kit：schema 用 TS 定义，迁移由 drizzle-kit 生成 SQL 文件并纳入版本库评审；pgvector 使用其官方 `vector` 列类型。查询保持 SQL 直译心智；混合检索排序等复杂查询允许直接使用 drizzle 的 `sql` 模板或原生 SQL。schema 作为类型源，向 zod 推导供 Server Function 入参校验复用（消费方经 ADR-0025 由 tRPC procedure 改为 Server Actions，2026-11-13 修订）。

## 备选方案

### Prisma
- 优点：schema DSL 与迁移体验成熟，文档完善，社区最大；新一代免引擎 client 已显著改善打包与冷启动。
- 缺点：抽象层厚，PG 特有能力的暴露弱于 Drizzle；查询 API 与 SQL 的心智映射更远。
- 否决原因：在「类型直通 + PG 特性 + 运行时轻量」三个权重最高的维度上 Drizzle 更优。Prisma 作为次选保留。

### Kysely
- 优点：类型安全查询构建器中 SQL 映射最纯粹。
- 缺点：不含 schema 定义与迁移管理闭环，需要另配工具。
- 否决原因：需要 schema → 迁移 → 查询一体化的工程闭环。

### TypeORM
- 优点：装饰器实体模型，NestJS 生态常用。
- 缺点：维护节奏与类型推断质量近年落后；装饰器元编程在 RSC 代码库中带来额外配置。
- 否决原因：活跃度与类型体验不足。

## 后果

### 正面
- 无独立引擎/WASM 依赖，容器内冷启动轻，贴合服务端组件直连数据的架构。
- schema 即类型源：改表 → 查询 → Server Function → 客户端 hooks 的类型错误即时暴露。

### 负面
- 抽象薄意味着写复杂查询仍需 SQL 功底。
- drizzle-kit 对 rename 等破坏性变更的推断需要人工核对生成的 SQL。
- 教程与生态规模小于 Prisma，排错更多靠官方文档与源码。

### 风险
- Drizzle API 仍在快速演进：锁定 minor 版本，升级时通读 changelog 并跑全量回归。

## 相关决策

- [ADR-0005：PostgreSQL 17 + pgvector](./postgresql-pgvector)
- [ADR-0025：客户端数据层 TanStack Query + Server Actions](./client-data-layer)（zod schema 消费方）

---
title: 架构评审：数据流向统一与增删改查收敛
description: store 居中的单一线数据流重构裁决——features/modules 分层、统一接口吸收 actions、认证域客户端化、AI 链路 BFF 外包
sidebar_position: 2
---

# 架构评审：数据流向统一与增删改查收敛

**状态**：已批准（批准人：海渝，2026-11-24）

## 评审范围与触发背景

开发者显式请求：重新设计数据流向（方案：reactUI → store → 统一增删改查接口 → query/service → db model → PostgreSQL），探讨目录树调整、增删改查收缩；约束为**禁止多条独立数据流向，只允许一条**。涉及真源：`docs/dev/代码目录.md`（目录树/模块形状/数据流向三节）、ADR-0009/0013/0025/0029/0030/0032。

## 风险清单

| # | 维度 | 风险 | 证据 | 影响面 |
| - | ---- | ---- | ---- | ------ |
| R1 | 数据流向 | store 居中方案与 ADR-0009（服务端数据不进 store）、ADR-0025 决策 6（不为服务端数据维护客户端缓存层）正面冲突 | ADR 索引两行硬约束；`src/stores/` 空目录无使用证据 | 采纳即需修订 ADR-0009 条款、以新 ADR 取代 ADR-0025 |
| R2 | 模块形状 | 引入 `src/features/` 若语义错位（共享 UI）将与 modules/ 双轨 | 真源 modules「业务域，垂直切片」；UI 现居 `modules/<m>/components/` | 每处改动要想两次「放哪」 |
| R3 | 数据流向 | `deleteEntryAction` 未走 `runAction` 归一流，自建胶水，与文件头注自相矛盾 | `src/modules/calendar/actions.ts:15`（头注）vs `:67-85`（实现） | 「增删改查散布」的实际形态是归一流存在一处偏差，非缺层 |
| R4 | 模块形状 | `service.ts` 职责漂移：混入纯日期数学 35 行，且反向 import 客户端文件 `useClientScreen` 的类型 | `src/modules/calendar/service.ts:11,67-102` | 逻辑层依赖展示层文件，模块形状约定被稀释 |
| R5 | 真源漂移 | 目录树图列 `src/agent/` 但磁盘无此目录；`src/stores/` 空目录在图有行无实例 | 真源目录树 vs `ls src/agent` 失败 | 下游设计按图找落点撞空 |
| R6 | 数据流向 | 认证域三形态并存：会话读走 RSC 服务端直调（不经 HTTP）、登录/登出走 authClient HTTP、注册走 Server Action | `getCurrentSession` 16 处调用；`SignOutButton`→authClient；`registerAction`→service 直写 | 认证域是「散布」最重处，比 CRUD 域更甚 |

## 裁决记录

| # | 裁决点 | 裁定（开发者选定） | 关键理由与风险 |
| - | ------ | ------------------ | -------------- |
| 1 | 数据流骨架 | **store 居中**：`features → stores → 统一接口 → modules → db → PostgreSQL`，不妥协 | 后果已明示：推翻 ADR-0009 条款、取代 ADR-0025（走 adr_writing）；RSC 碰不到浏览器 store，页面主体客户端化，`page.tsx` 退薄壳；服务端数据在客户端出现缓存副本，失效编排由 store 层承担 |
| 2 | 目录树形状 | **`src/features/` = 业务组件**（各业务域 UI，只经 store 取数据）；**`src/modules/` = 业务逻辑**（queries/service/validators/schema）；`src/components/` 保持纯展示基础件（shadcn/ui + 通用件） | UI 与业务逻辑分离，单一目录维度各自承载，数据流单线穿过 |
| 3 | 统一接口形态 | **吸收全部 actions**；传输形态 = HTTP Route Handler（Next 约定物理落点 `src/app/api/<m>/…/route.ts`）；`runAction` 胶水改造成 Route Handler 侧共享 helper；RSC 首屏直读废除；queries/service **分文件保留** | 读链写链合流为「store ↔ 统一接口」一条管道；模块内不再收缩（读写分文件保可读性与测试测点） |
| 4 | service 职责漂移 | **随重构一并拆出**：日期数学迁出 service.ts，消除 service→useClientScreen 反向类型依赖 | 顺带修 R3：归一流偏差在重构中一并消灭 |
| 5a | 会话 store | **authClient 即会话 store**（nanostores，库内建自动同步）；**守卫逻辑客户端化**——服务端 layout 读会话转为客户端从会话 store 判断；zustand 不碰会话 | 安全后果硬约束：服务端守卫移除后，安全边界完全落在统一接口逐端点会话校验上 |
| 5b | 认证端点版图 | `/api/auth/[...all]` 承认为统一接口的认证段（ADR-0013 不动）；**注册改走自写端点** `POST /api/auth/register` → 复用 `registerWithUsername`，`registerAction` 废除 | 与其他域 route.ts 同构，改动最小 |
| 6 | AI 流链 | **禁止豁免，并入同一条数据流**：前端 → 统一接口（SSE 端点）→ Next BFF（发送/响应数据加工 + 持久化经 modules）→ python agent-service（**纯计算，无持久层**）；本质是把 server 层的 AI 服务外包给成熟框架所在的 python 服务 | 与 ADR-0029/0030 现行条款部分出入，随 ADR 修订一并处理；python 侧持久化条款（ADR-0032）需在 adr_writing 中与本裁决对表 |

## 数据流目标形态（回写底稿）

```
React UI (src/features/)
    │ 用户交互触发事件
    ▼
Store (src/stores/, authClient.useSession)
    │ zustand action 更新本地状态, 经 fetch 调用统一接口
    ▼
统一接口 (src/app/api/)
    │ 会话校验, zod 复验, 错误归一, 路由到对应业务逻辑
    ▼
Service / Queries (src/modules/)
    │ 执行业务逻辑, 调用 DB model
    ▼
DB Model (src/db/)
    │ 封装 Drizzle ORM 查询
    ▼
PostgreSQL
```

## 观察项

| # | 观察项 | 触发条件 | 复查时机 |
| - | ------ | -------- | -------- |
| 1 | store 服务端数据失效编排的实际复杂度（登出/过期/401 三处失效、写后重取） | 首个业务域迁移完成后 | 该域 feat 回顾时复查，必要时登记新裁决 |
| 2 | 前端聊天流态承载（AI SDK useChat 内建状态 vs 入 zustand） | AXY-25 design 重开 | 届时 dev_architecture_design 按本裁决 BFF 框架细化 |

## 真源回写清单

| 真源文件 | 目标节 | 回写内容 |
| -------- | ------ | -------- |
| docs/dev/代码目录.md | 目录树 | 增 `src/features/`（业务组件）；`src/modules/` 语义改注「业务逻辑」；`src/stores/` 改注「zustand：业务数据客户端持有层」；`src/agent/` 行删除（幽灵目录，AI 能力域归 modules/agent）；模块形状图整体重写 |
| docs/dev/代码目录.md | 数据流向 | 整体替换为「数据流目标形态」——单条数据流，认证/AI 为统一接口段，禁止单列独立流 |
| ADR | — | adr_writing 衔接：新 ADR 取代 ADR-0025；修订 ADR-0009 条款（服务端数据可进 store）；ADR-0029/0030/0032 与裁决 6 对表修订 |

## 下游衔接

- 重构实施另起 feat/AXY 流程（本技能只裁决不实施）：现有 `modules/<m>/components/` 迁 `features/<m>/`、`useClientScreen` 迁 features、actions 全部废除换 route.ts、`(app)` layout 守卫客户端化；
- ⚠️ 本地 stash（「agent-service 能力引擎目录树评审收尾」）触碰同一批真源文件，其模块形状图与内部 `internal.ts` 集成层描述与本裁决的新形状不一致——批准后需与开发者对表处置（丢弃或人工对表合并），不得直接 pop。

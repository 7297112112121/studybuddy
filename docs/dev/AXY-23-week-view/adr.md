---
title: 'Design: AXY-23 日程周视图 · 与 ADR 的关系'
description: 日程周视图的 ADR 一致性一页纸与 Q 条目去向
sidebar_position: 5
---

# Design: AXY-23 日程周视图 · 与 ADR 的关系

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 一致性对照

逐条对照 `docs/dev/adr/index.md`「现行技术栈速查」内联完成;无新选型、无拟偏离项,未触发子代理三条件。

| 涉及技术 | ADR | 一致性 |
| ---- | ---- | ---- |
| Next.js 16 + App Router(searchParams 服务端导航、`instant = false`) | ADR-0001 / ADR-0002 | 一致——完全沿用 calendar page 既有模式(`await searchParams`、cacheComponents 豁免先例),无新 API;未触发回读信号 |
| Tailwind CSS 4(样式 token) | ADR-0003 | 一致——零新色值:色块/实时线/空态全部复用 `calendar-theme` 既有语义 token;实心控件(重试按钮、切换分段控件)纯色无渐变;未触发回读信号 |
| shadcn/ui(新增 Dialog 组件) | ADR-0004 | 一致——已回读全文确认:经 CLI 复制源码进仓库、按需 diff 上游、不整体升级;**新组件引入单独成 commit**(ADR 风险节约定) |
| PostgreSQL + Drizzle ORM(零迁移) | ADR-0005 / ADR-0006 | 一致——零 schema 改动、零迁移文件,不触碰 drizzle-kit 流程 |
| zustand(视图态归属) | ADR-0009 | 一致——视图/所在周态入 URL(searchParams),编辑卡开关与实时线为组件本地态;无一进 store |
| next-intl(新增文案键) | ADR-0010 | 一致——`calendar.week.*` 键经既有 `getTranslations`/`useTranslations` 读取,语言维度缓存机制原样生效 |
| Vitest(纯函数 + 组件单测) | ADR-0012 | 一致——`week.ts` 纯函数与客户端组件可单测;RSC page 不做单测,留 E2E 补位(既有约定) |
| Better Auth(会话) | ADR-0013 | 一致——`getCurrentSession` 既有取法,零新插件/配置 |
| Playwright(E2E) | ADR-0017 | 一致——只测演示态关键旅程,对生产构建跑,无 LLM 调用 |
| TanStack Query + Server Actions(数据流) | ADR-0025 | 一致——读走 RSC props 下行(无并行分发、无 GET 缓存诉求),写原样复用既有 actions(判别联合返回,无裸异常);未触发回读信号 |

## Q 条目去向

本设计不含以下条目的验证,由测试提质阶段验收(proposal 第 12 节):

- **Q1**(周视图首屏可交互 ≤ 2s,一周条目 ≤ 100 条)
- **Q2**(条目查询 p95 ≤ 500ms,≥ 100 次采样)
- **Q3**(实时线每分钟更新不引发整网格重排,更新耗时 ≤ 16ms)

设计期的对应取舍仅到「实现手法利于达标」为止:重叠布局与实时线位置计算收敛为纯函数(可独立单测与优化),实时线更新只改单点定位样式、不重排网格——不承载指标验证本身。

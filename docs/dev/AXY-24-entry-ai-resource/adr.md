---
title: 'Design: AXY-24 条目 AI 资料提案 · 与 ADR 的关系'
description: 条目 AI 资料提案的 ADR 一致性一页纸与 Q 条目去向
sidebar_position: 5
---

# Design: AXY-24 条目 AI 资料提案 · 与 ADR 的关系

> 本文件为 design 的拆出节,批准状态以 [design.md](design) 头部表为准,不另设状态列。

## 一致性对照

速查表可判定的条目直接判定;信号命中的(0014/0024)已回读全文后判定。

| 涉及技术 | ADR | 一致性 |
| ---- | ---- | ---- |
| Next.js 16 + App Router(不新增路由,Server Actions 既有形状) | ADR-0001/0002 | 一致(零新路由、零新 API 面,不触碰 cacheComponents 语义) |
| Tailwind CSS 4 语义 token(浮层样式,无新色值) | ADR-0003 | 一致 |
| shadcn/ui(Dialog/Input/Label/Button 按需源码复制) | ADR-0004 | 一致 |
| PostgreSQL 17(业务数据:entry_resource) | ADR-0005 | 一致(不涉及 pgvector;无向量写入,非目标 #6) |
| Drizzle ORM + drizzle-kit 迁移 | ADR-0006 | 一致(迁移生成入库评审,禁手改) |
| Redis(不动;无队列 / 过期态需求,提案为界面临时态) | ADR-0007 | 一致(无新使用) |
| zustand(不用:提案临时态为浮层本地 state) | ADR-0009 | 一致(轴 5 阶段 0:弹窗状态归组件本地) |
| next-intl(新文案 key 挂 calendar 命名空间,错误 key 不返原文) | ADR-0010 | 一致(E-02/E-03 的 AI 理由原文为数据拼接,固定句式走 key) |
| Better Auth 会话(getCurrentSession / runAction 归一流) | ADR-0013 | 一致 |
| Vercel AI SDK(generateObject 结构化两处;检索调用局部直连) | ADR-0014 | 一致(逃生舱条款首次动用,已回读全文;provider 切换经 ADR-0028) |
| Vitest(单元 + 集成;AI 调用一律 mock) | ADR-0012 | 一致 |
| Playwright E2E(关键旅程;stub 门控替身) | ADR-0017 | 一致(LLM 调用零真实出网) |
| CI 机密(DEEPSEEK_API_KEY 仅服务器 env,零过 CI) | ADR-0022 | 一致 |
| DeepSeek 提供方 + 服务端联网工具 + 两段式调用形态 | **ADR-0028(本 PR 新提,随 design 批准转已接受)** | 本设计的前提决策,见 [0028](../adr/0028-deepseek-provider-web-search) |
| OpenTelemetry(AI SDK telemetry 埋点,涉用户条目内容) | ADR-0024 | 一致(回读全文确认):AI SDK `experimental_telemetry` 为唯一埋点面;条目文字属用户内容,检索/规划 span 关 `recordInputs/Outputs`(涉敏链路条款),仅记 token 用量与耗时 |

## Q 条目去向

本设计不含以下条目的验证,由测试提质阶段验收(proposal 第 12 节,spec-review 终审不核对):

- **Q1**(提案生成端到端等待 p95 ≤ 15s)——设计侧仅保证两段式调用结构,不设性能实现项;
- **Q2**(确认写入接口 p95 ≤ 1s)——事务结构已定,度量归测试提质;
- **Q3**(AI 产出链接抽检可达率 ≥ 90%)——设计以「URL ∈ 检索来源集」代码不变量提升达成概率,验收归测试提质(人工抽检接缝见 testing.md);
- **Q4**(`/calendar` 首屏 ≤ 2s 不劣化)——本特性零首屏新增(浮层按需挂载),度量归测试提质。

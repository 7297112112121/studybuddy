---
title: 特性开发流程调研:lobehub 与 superpowers
description: 调研 lobehub 仓库从需求到编码的完整特性开发流程,并对比 obra/superpowers 的 SDD 原子技能体系,为本项目流程建设提供参考
sidebar_position: 2
---

# 特性开发流程调研:lobehub 与 superpowers

**调研日期**:2026-11-13 **调研对象**:[lobehub/lobehub](https://github.com/lobehub/lobehub)(本地 canary 分支)、[obra/superpowers](https://github.com/obra/superpowers)(v2025 版技能集)

## 一、lobehub:领域即技能的分级规范体系

LobeHub 的特性开发存在两条并行流程。面向社区贡献者的流程(GitHub Issue 模板 → fork → PR)较为常规;内部主力流程则高度 AI 代理化,由 `AGENTS.md` 统辖架构与工作流,细节规则沉淀于 `.agents/skills/` 下约 50 个技能(react、zustand、source-layout、drizzle 等),并辅以 Linear 任务树、stacked PR、PR 准入机器人等治理机制。

其流程要点:需求经 GitHub Discussions RFC 或 Linear 子任务树(带拓扑编号与 `blockedBy` 依赖,子任务须自包含验收标准)进入;大特性先产出设计规格(`product-design` 技能的 Discover/Frame/Materialize 三档模式,规格含状态生命周期与假设核查表),沉淀于 `docs/development/*-design.md`;实现按七层分层架构进行,受 `bun run check` 质量门禁约束(每个缺陷修复须有先红后绿的回归测试);交付以**产品级验收**收口——须在真实产品上验证并发布验收轮次链接,测试与类型检查不可替代。

**是否 SDD**:非严格意义的 SDD。无"每特性必走 spec→plan→实现"的强制脚手架——大特性规格前置、小特性直通,规范密度集中在长期演进的技能体系与验收证据闭环上,属"约定即代码 + 分级规格化 + 证据驱动验收"的混合形态。

## 二、superpowers:流程即技能的严格 SDD

Superpowers(Jesse Vincent 出品)是装在编码代理上的通用开发方法论,仅含 15 个原子技能,经 hook 强制串成固定流水线:brainstorming(需求对话→设计文档,**不获批准不得写任何产品代码**)→ writing-plans(规格拆为 2–5 分钟微任务,含任务间 Interfaces 块与 Review Focus 清单)→ subagent-driven-development(每任务派全新子代理实现、独立评审、台账抗上下文压缩、裁决不停摆)→ TDD 铁律(无先失败的测试即无产品代码,违者删除重写)→ verification-before-completion(无新鲜证据不得声称完成)。规格为"绑定权威",计划是其论证,是教科书式的规范驱动开发。

## 三、对比与结论

两者本质差异:**Superpowers 将纪律装进代理运行时,管"任何软件该如何构建";LobeHub 将领域知识装进技能、纪律外化至门禁与验收平台,管"本仓库的规矩"。** 前者信前置对齐,后者信后置验证。共同点:一切落盘(规格/计划/台账)、证据驱动、子代理上下文隔离、针对代理"合理化偷懒"的显式防御。

**对 studybuddy 的借鉴**(按迁移成本排序):①大特性设设计文档批准门,批准前不写产品代码;②计划中引入 Interfaces 块与 Review Focus 清单;③强化测试表述为"未看着测试失败,即未测过";④长任务以文件台账而非会话记忆承载进度。LobeHub 的验收平台与大规模技能矩阵系团队规模产物,现阶段不必效仿。

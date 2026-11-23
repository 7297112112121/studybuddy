---
title: 架构评审：python 服务落点缺口
description: ADR-0029/0030 引入的 python Agent Service 在代码目录全景中无落点——评审与真源回写
sidebar_position: 1
---

# 架构评审：python 服务落点缺口

**状态**：已批准（批准人：海渝，2026-11-23）

## 评审范围与触发背景

dev_architecture_design（AXY-25 陪伴闲聊伙伴）盘点落点时发现：python 服务代码在 `docs/dev/代码目录.md` 清单中装不下，按回流规则上浮本技能从全局视角处理。评审范围仅限 python 服务的代码落点与其在真源全景中的表达；TS 侧 `src/agent/`（AI 能力子系统）的内部边界归属属特性级设计，不在本次范围。

## 风险清单

| # | 风险 | 证据 | 影响面 |
| - | ---- | ---- | ------ |
| R1 | 落点缺口：python Agent Service 是已接受的独立部署单元，但代码目录全景无其代码落点 | [ADR-0029](../adr/0029-agentscope.md) 决策 6；[ADR-0030](../adr/0030-sse-streaming.md) 决策 2/4；compose.yaml services 无 python 服务；顶层无 python 目录；`src/agent/` 仅 `.gitkeep` | AXY-25 design 现在就要落 python 代码，无清单位置只能就近发明；后续每个 AI 特性重撞同一缺口 |
| R2 | 真源漂移：目录树顶层「Dockerfile compose.yaml Caddyfile # 部署单元」暗示单镜像形态；数据流向图无 AI 链路 | [代码目录.md](../代码目录.md) 目录树末行与数据流向节 vs ADR-0029/0030 已接受的双应用镜像 + AI 流式链路拓扑 | 下游设计按单镜像与纯 CRUD 数据流理解，AI 链路成为图外幽灵路径 |

## 裁决记录

| # | 候选 | 理由 | 风险 | 裁定 |
| - | ---- | ---- | ---- | ---- |
| 1 | A. 顶层 `agent-service/`（与 Dockerfile/compose.yaml 平级） | 一个部署单元一个顶层目录；TS/python 两个世界顶层分离，构建、依赖、测试工具链互不污染；命名与 ADR-0029/0030「Agent Service」术语一致 | 顶层目录 +1；与 `src/agent/`（TS 侧 AI 子系统）名字相近，靠真源文档区分职责 | ✅ 开发者选定（2026-11-23） |
| 1 | B. 顶层 `services/agent/` | 为未来多 python 服务预留命名空间 | 单服务背空壳层；假想需求无证据，违反「不为假想需求预留」 | 否决 |
| 1 | C. 顶层 `python/` | 按语言分组直白 | 命名维度不一致（src 按框架、此按语言）；目录名不表意，与 ADR 术语脱节 | 否决 |

## 观察项

| # | 观察项 | 触发条件 | 复查时机 |
| - | ------ | -------- | -------- |
| 1 | 是否引入 `services/` 命名空间收纳多 python 服务 | 第二个 python 部署单元立项时 | 届时 architecture_evolution 重开评审 |

## 真源回写清单

| 真源文件 | 目标节 | 回写内容 |
| -------- | ------ | -------- |
| docs/dev/代码目录.md | 目录树 | 增补顶层 `agent-service/`（python 世界：AgentScope 2.0 Agent Service、FastAPI 入口、pyproject 钉版、独立 Dockerfile）；部署单元行改为双应用镜像 + 同一 compose 编排（app + agent-service，后者仅内网可达） |
| docs/dev/代码目录.md | 数据流向 | 增补 AI 流式链路图：前端 → Next Route Handler（SSE 加工）→ agent-service（Agent Service 会话事件流）→ PG（含 pgvector 记忆）/Redis |

无新增 ADR：选型本体已由 ADR-0029/0030 承载，本次只补落点与全景表达。compose.yaml 增补 agent-service 服务属实施动作，随 AXY-25 feat 流程落地，本技能不改。

## 下游衔接

- AXY-25 dev_architecture_design：落点开放问题按裁决闭合——`agent-service/` 成为清单内位置，设计继续；
- 重构/实施：无独立重构项，落点随 AXY-25 实现自然建立。

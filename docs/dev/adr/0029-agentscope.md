---
title: ADR-0029：AI 服务框架采用 AgentScope 2.0
description: python AI 能力服务采用 AgentScope 2.0：ReActAgent 承载推理循环，Toolkit 承载工具与运行时技能，Context 承载长期记忆；多用户隔离与多提供方模型切换由框架内建能力承载
---

# ADR-0029：AI 服务框架采用 AgentScope 2.0

## 状态

已接受（Accepted）

## 日期

2026-11-23

## 背景

- AI 能力需求清单：ReAct 推理循环、工具回调、运行时可加载能力包（技能）、跨会话长期记忆、多用户隔离、模型多提供方可切换（DeepSeek 等国内提供方必备）。
- python AI 服务与 Next.js 应用同 Docker Compose 单机编排部署，服务间走内部网络；存储复用仓库自有 PostgreSQL 17 + pgvector 与 Redis 7；用户身份体系为 Better Auth 会话。
- 规模约束：小规模初期，个位数到十几并发用户，单请求推理循环几轮到十几轮；「开箱即用」为硬性偏好。
- 选型事实（查证日期 2026-11-23，来源：GitHub Releases API、PyPI 项目页、各框架官方文档）：
  - AgentScope 2.0.12（Apache-2.0）：ReAct Agent、Toolkit（Python 函数 + MCP + skills 集成）、Context（长期记忆，Mem0/ReMe 与向量库集成）、用户/agent/会话三级隔离与多租户多会话后端均为内建能力；模型凭证内置 DeepSeek/DashScope/MiniMax/OpenAI/Anthropic/Gemini。
  - Pydantic AI 2.71.0（MIT）：提供方目录最全（deepseek 一等支持 + model fallback 故障切换），形态是 SDK，长期记忆与多租户不在盒内。
  - OpenAI Agents SDK 0.25.0（MIT）：循环/工具/guardrail 开箱即用，模型层一等支持仅 OpenAI。
  - LangGraph 1.2.24（MIT）：官方自述 low-level orchestration framework，durable execution/持久化/记忆为基建形态，需自行组装。
  - Microsoft Agent Framework：PyPI 包存在（MIT），GitHub 仓库地址本轮查证 404 未核实，生态中心在 Azure/Foundry。
- 部署环境无 Azure 依赖。

## 决策

AI 能力服务采用 AgentScope 2.0：

1. 推理循环：用 ReActAgent 承载 ReAct 循环与工具执行，不自行实现推理循环；
2. 工具与技能：Toolkit 注册工具（Python 函数与 MCP），技能以运行时可加载能力包接入；
3. 记忆：会话上下文与长期记忆由 Context 块承载，向量记忆对接仓库自有 PostgreSQL pgvector，不引入独立记忆服务；
4. 多用户隔离：启用框架的用户/会话级隔离，用户身份与 Better Auth 会话对接，AI 侧不另建身份体系；
5. 模型接入：一律经 AgentScope Credential 配置（api_key/base_url），提供方与模型可配置切换，禁止在代码中硬编码提供方；
6. 部署：python AI 服务与 Next.js 应用进同一 Docker Compose 编排，仅内网可达；
7. 版本：依赖钉住 2.x 具体 minor 版本，跨 minor 升级前核对官方 breaking change 清单。

## 备选方案

### Pydantic AI

- 优点：提供方目录五个候选最全（deepseek 一等支持 + model fallback 故障切换）；端到端类型安全；SDK 形态轻，服务层自由度大。
- 缺点：长期记忆、多租户隔离、沙箱、运行时能力包均不在盒内，全部自建。
- 否决原因：与「开箱即用」硬性偏好正面冲突，长期记忆与多用户隔离两个评分项变成两个后续自建负担。

### OpenAI Agents SDK

- 优点：循环/工具/guardrail 开箱即用，概念面小上手快，OpenAI 官方维护文档质量高。
- 缺点：模型层一等支持仅 OpenAI，DeepSeek 走 LiteLLM 兼容层为二等路径；记忆与多租户不在盒内；tracing 生态偏向 OpenAI 平台。
- 否决原因：多提供方可切换是硬约束，兼容层路径不可靠；记忆/隔离仍需自建。

### LangGraph

- 优点：生态最大，durable execution、持久化、记忆基建最全，定制自由度最高。
- 缺点：官方自述 low-level orchestration，循环外的持久化/记忆/部署全部自行组装。
- 否决原因：组装成本与「开箱即用」要求正面冲突。

### Microsoft Agent Framework

- 优点：OpenAI/Azure 一等支持，workflows 编排，微软官方出品。
- 缺点：生态中心在 Azure/Foundry，国内提供方非一等；GitHub 仓库地址查证 404，版本与迁移状态未核实。
- 否决原因：仓库部署无 Azure 依赖，引入微软生态必要性弱；仓库地址未核实本身即维护风险。

## 后果

### 正面

- 需求清单六个能力点（循环/工具/技能/记忆/隔离/多提供方）全部由框架内建承载，零自建件。
- DeepSeek 等国内提供方一等支持，模型切换降级为配置操作。
- 长期记忆与多用户隔离不再需要独立选型。

### 负面

- 全栈框架黑盒面大，深度定制需读框架源码。
- 2.0 相对 1.x 为 breaking change，网络资料与 AI 训练记忆混杂旧 API，落地必须以官方 2.0.12 文档为准。

### 风险

- Context 记忆与 pgvector 对接的成熟度需在实现期以真实场景验证；若记忆能力不足，以新 ADR 重新评估独立记忆方案。
- 若未来进入中规模（几十并发以上），框架多租户后端的分布式部署能力需重新验证。

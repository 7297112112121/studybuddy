---
title: ADR-0032：AI 长期记忆采用 Mem0（pgvector 后端）落自有 PostgreSQL
description: AI 长期记忆用 AgentScope 内建 Mem0Middleware 承载 mem0 OSS AsyncMemory，vector store 与 history 落自有 PostgreSQL pgvector；不用 mem0 托管平台、不自建记忆中间件
---

# ADR-0032：AI 长期记忆采用 Mem0（pgvector 后端）落自有 PostgreSQL

## 状态

已接受（Accepted）

## 日期

2026-11-23

## 背景

- AI 服务框架已定为 AgentScope 2.0.12（PyPI 查证 2026-11-23），长期记忆由框架内建记忆中间件承载，可选实现有 Mem0Middleware（mem0 OSS 内嵌库或托管平台）、ReMeMiddleware（第三方记忆链透传）、AgenticMemoryMiddleware（Markdown 文件式）。
- 开发者裁定记忆方案的硬约束有三：多副本部署时记忆天然一致（不依赖单机数据卷）、记忆可 SQL 查询（不建只读文件态）、不新增独立于数据库之外的备份面。
- 查证（2026-11-23，GitHub 源码与 API）：AgentScope RAG 模块向量库后端不含 pgvector，官方亦无支持计划（社区提交被关闭未合并、维护者承诺未兑现、路线图无条目）；但 mem0 OSS 官方自带 pgvector 向量库后端（mem0/vector_stores/pgvector.py）与可落 PostgreSQL 的 history DB；AgentScope 的 Mem0Middleware 提供「模型 + 自定义 MemoryConfig」接线方式，llm/embedder 槽位由框架适配器接管，vector store 与 history 槽位原样保留。
- 记忆抽取与检索需要 embedding 模型：DeepSeek 无 embedding API；AgentScope 内建 embedding 供应方为 DashScope/Gemini/Ollama/OpenAI（源码 embedding 目录查证），无智谱原生供应方，但其 OpenAI embedding 模型类的凭据支持自定义 base_url（源码 credential 与 embedding/_openai 查证），而智谱 API 提供 OpenAI 兼容端点，Embedding-3 可经该路径承载。
- 部署为 Docker Compose 单机自托管，PostgreSQL 镜像为 pgvector 预置版，向量扩展开箱可用。

## 决策

AI 长期记忆采用内建 Mem0Middleware 承载 mem0 OSS（AsyncMemory），向量与历史落自有 PostgreSQL：

1. 记忆中间件经服务工厂的 extra_agent_middlewares 挂载，后端用 mem0 OSS 内嵌库 AsyncMemory，不使用 mem0 托管平台客户端；
2. mem0_config 中 vector_store 用 pgvector provider 落自有 PostgreSQL，history DB 落同实例 PostgreSQL；llm 槽位绑定 DeepSeek 会话模型适配器，embedder 槽位绑定智谱 Embedding-3——经框架 OpenAI 兼容 embedding 模型类承载（凭据 base_url 指向智谱端点，模型名 embedding-3），不为此自写模型适配器；
3. 不使用 AgenticMemory 与 ReMe 中间件，不自建记忆中间件，不引入 mem0 之外的独立向量库与向量服务；
4. embedding 凭据经环境变量注入 python 服务，不在代码中硬编码；
5. mem0 自管其记忆表结构（不进业务 schema 迁移体系），记忆数据可 SQL 查询、随 PostgreSQL 备份体系覆盖；
6. mem0 依赖钉住具体 minor 版本，升级前核对其 breaking change；当记忆抽取/检索质量不足以支撑「隔天主动续上」的产品验收时，以新 ADR 重新评估记忆方案。

## 备选方案

### ReMe 中间件 + pgvector 后端透传

- 优点：记忆同样落自有 PostgreSQL；ReMe 为框架官方团队出品。
- 缺点：pgvector 后端经第三方记忆链（reme-ai/flowllm）透传实现，不在框架官方支持面内；该组合存在未修复的开源缺陷（asyncpg 元数据过滤参数类型错误，issue 处于 open 状态）；需额外配置 embedding 模型。
- 否决原因：与 Mem0 路径同样落 PG，但 Mem0Middleware 原生保留 vector store 槽位、mem0 官方直接维护 pgvector 后端，一等程度更高且无已知 open 缺陷。

### AgenticMemoryMiddleware（Markdown 文件式）

- 优点：框架一等内建、零新增依赖与密钥、开箱即用程度最高。
- 缺点：记忆为文件态——多副本部署依赖单机数据卷、不可 SQL 查询、需要独立于数据库的备份面。
- 否决原因：与开发者裁定的三条硬约束（多副本一致、SQL 可查、不新增备份面）全部冲突。

### 自建 pgvector 记忆中间件

- 优点：记忆读写完全受控，表结构进自有迁移体系。
- 缺点：需自建记忆写入/检索/摘要全链路并长期维护，新增 python 侧 SQL 与 embedding 客户端代码。
- 否决原因：违背「开箱即用」硬性偏好，首期量级不值得自建。

## 后果

### 正面

- 记忆向量与历史落自有 PostgreSQL：多副本部署天然一致，可 SQL 查询，备份随数据库体系覆盖，与「向量与业务数据同库」的数据库纪律同向。
- AgentScope 一等内建中间件 + mem0 官方 pgvector 后端，零自建记忆代码。

### 负面

- 新增 mem0 python 依赖与智谱 embedding 密钥两个供给面。
- mem0 记忆表结构由其自管，升级随 mem0 版本演进，不进自有迁移评审体系。
- 记忆抽取/检索质量取决于 LLM 与 embedding 模型效果，调优面在 mem0 配置层。

### 风险

- mem0 迭代较快：钉 minor + 升级核对是长期纪律，违反则记忆行为可能静默漂移。
- embedding 调用引入新的外部配额与费用面，需在性能验证期观察。
- pgvector 检索在记忆量级增长后（万条级）的性能未经验证；首期个位数量级用户风险低。

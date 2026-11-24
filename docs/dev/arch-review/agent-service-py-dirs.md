---
title: 架构评审：agent-service py 代码目录结构
description: agent-service/ python 侧目录方案评审——六个能力目录的实义校准、存储适配层缺口、tool/skill 分离与校验归属
sidebar_position: 1
---

# 架构评审：agent-service py 代码目录结构

**状态**：已批准（批准人：海渝，2026-11-24；批准覆盖本文档当前内容）

## 评审范围与触发背景

显式请求:开发者提出 `agent-service/`(python 侧)的目录方案并要求评价——`agent/`(配置 agent)、`api/`(对外端口)、`memory/`(记忆逻辑)、`rag/`(知识库逻辑)、`tool/`(工具封装)、`mcp/`(独立服务进程调用)。评审范围仅限 python 侧源码目录结构;`agent-service/` 顶层落点已由 [agent-service-placement](agent-service-placement.md) 裁定,不重开。

证据基础:

- AgentScope 2.x 框架内建模块:`agent/model/credential/tool/mcp/skill/state/middleware(记忆+RAG)/event/permission/workspace/rag/embedding/app(service 层)`——本评审的自定义目录是给自建代码找家,不与框架模块一一对应。
- [ADR-0029](../adr/0029-agentscope.md):ReActAgent 循环、Toolkit 承载工具+技能、Mem0Middleware 记忆、Better Auth 会话对接、Credential 全走环境变量。
- [ADR-0034](../adr/0034-ai-persistence-boundary.md):python 无持久层;mem0 存储适配层(经 Next 内网 API)为明文新增自维护代码;记忆与 RAG 存取同通道。
- [ADR-0030](../adr/0030-sse-streaming.md):用 Agent Service 会话事件流不自建协议;`main.py` FastAPI 入口组装框架 service;用户输入走普通 POST 不经流通道。
- [ADR-0033](../adr/0033-store-centric-data-layer.md):store 居中单流,业务组件只订阅 store,读写经统一接口。
- 磁盘现状:`agent-service/` git 未跟踪、无源码,仅 spike 运行时产物(`workspaces/<uuid>/skills`)——目录方案服务于即将开始的实现。

## 风险清单

| # | 风险 | 证据 | 影响面 |
| - | ---- | ---- | ------ |
| R1 | 存储适配层无家:ADR-0034 要求的 mem0 存储适配层(经 Next 内网 API,明文"新增的自维护代码")横切 memory 与 RAG(同通道),六目录方案无落点 | ADR-0034 决策 2/3 与「负面」节 | python 侧最大自定义模块在方案里没有归属,实现期只能就地发明,归属随人漂移 |
| R2 | `memory/` 命名与实义漂移:记忆逻辑由框架 Mem0Middleware 承载,目录实义只有存储适配(HTTP 转发) | ADR-0029 决策 3;ADR-0034 决策 3 | 读代码者在 `memory/` 找记忆逻辑却发现只是适配层,认知负担与命名误导 |
| R3 | `mcp/` 单列偏薄:MCP 客户端与 transport 由框架 `agentscope.mcp` 承载,自定义量预计只有连接配置声明 | agentscope-skill 仓库结构 `mcp/` 节 | 初期目录内可能只有一两个配置文件,目录粒度大于实义 |
| R4 | `rag/` 现在建缺需求证据:当前无知识库特性 proposal;ADR-0034 提到 RAG 是通道预留非需求;RAG 计算本身也在框架 `rag/` 模块 | ADR-0034 决策 2;无知识库 proposal | 空目录/占位文件成为无证据包袱,违反「只设计足够当前需求的架构」 |
| R5 | `api/` 职责未定义:对外端口面很薄(事件流由框架承载),真正的自定义逻辑是 Better Auth 会话 → AgentScope 用户/会话映射 | ADR-0029 决策 4;ADR-0030 决策 2 | 不写明职责,`api/` 在迭代中退化为杂物间 |
| R6 | `tool/` 与技能未分离:技能是运行时可加载能力包,与函数工具封装是两类产物,框架侧亦分 `tool/` 与 `skill/` 两模块 | agentscope-skill 仓库结构 `tool/`、`skill/` 节;ADR-0029 决策 2 | 混装后技能包与工具封装互相纠缠,运行时加载边界不清 |
| R7 | python 侧入参校验归属未定:校验若在两侧重复做,规则双真源 | ADR-0034 决策 2(Next BFF 发送请求数据处理);校验域单一来源裁决(TS 侧已收 validators.ts) | 两侧各写一套校验规则,漂移后排查困难 |

## 裁决记录

| # | 候选 | 理由 | 风险 | 裁定 |
| - | ---- | ---- | ---- | ---- |
| R1 | A. 独立 `adapters/` 模块:Next 内网 API client + mem0 存储后端适配 | 横切通道独立成模块,与 `agent/` 平级的叶子模块,memory/tool 与未来 RAG 共用,依赖方向单向 | 目录数 +1;初期文件少 | ✅ 开发者选定(2026-11-24) |
| R1 | B. 并入 `memory/`,RAG 到来时再抽 | 少一个目录 | `memory/` 命名漂移保留;届时抽取为二次返工 | 否决 |
| R3 | A. 保留 `mcp/` 单列 | MCP server 清单与 transport 配置独立成目录,MCP 集成增多时边界清晰 | 初期目录内容薄 | ✅ 开发者选定(2026-11-24) |
| R3 | B. 并入 `tool/`(MCP 亦为工具来源) | 少一层跳转,工具注册与连接配置同处 | 与开发者意图不符 | 否决 |
| R4 | A. 延迟建 `rag/`,登记观察项 | 无需求证据不建;adapters 通道已就位,届时加目录零成本 | 目录树不完整展示 AI 能力全景 | ✅ 开发者选定(2026-11-24) |
| R4 | B. 现在建 `rag/` 占位 | 全景完整 | 无证据包袱 | 否决 |
| R6 | `skill/` 独立目录,与 `tool/` 分离 | 与框架模块划分一致;技能是运行时能力包,与函数工具封装是两类产物 | 目录数 +1 | ✅ 开发者选定(2026-11-24) |
| R7 | python 侧默认不做入参校验,校验单一归 Next BFF | 校验规则单一真源(TS 侧 validators);python 定位纯计算引擎(ADR-0034) | 信任模型依赖「仅内网可达」部署约束(ADR-0029 决策 6),端口暴露策略变化时须回头 | ✅ 开发者选定(2026-11-24) |
| 连接池 | 不自建连接池,不设目录:Next↔python 复用走 Node undici keep-alive(零代码);python 侧 live 消息路由由框架 message bus 承载,在 `main.py` 组装时传入 | ADR-0016 应用服务保持无状态;deployment guide:message bus 为框架内建(InMemoryMessageBus 单进程) | 多进程部署需 RedisMessageBus 时 python 将持 Redis 连接——归观察项 O2 | ✅ 开发者确认(2026-11-24) |

R2/R5 以目录注释形式落(目标结构中的职责说明),不单独出候选。

## 目标结构(裁决后)

```
agent-service/
├─ main.py          # 入口:组装框架 service(create_app:storage/message bus/workspace)+ 启动
├─ agent/           # agent 配置组装:model/credential、toolkit、middleware、技能装载
├─ api/             # 唯一入口(Next→python):会话事件流端点 + Better Auth 会话→AgentScope 用户/会话映射
├─ memory/          # mem0 存储适配层(经 adapters 通道转发,不自持记忆逻辑)
├─ tool/            # FunctionTool 封装:只写工具语义(签名/docstring/业务编排),不发 HTTP
├─ skill/           # 技能包:运行时可加载能力包,与 tool 分离
├─ mcp/             # MCP 连接配置:server 清单与 transport 声明(客户端由框架承载)
└─ adapters/        # 唯一出口(python→Next):内网 API client(mem0 存储、工具数据、未来 RAG 语料共用)
```

依赖与边界规则:

- 依赖方向单向:`main.py → api/ → agent/ → memory|tool|skill|mcp → adapters/`,无反向引用。
- 两条边界线:**下行** Next→python 只走 `api/`;**上行** python→Next 只走 `adapters/`——tool/skill/memory 不直接发 HTTP,adapters 不感知工具语义。
- python 默认不做入参校验(裁决 R7),`api/` 的 Better Auth 会话映射属身份识别,保留。

## 观察项

| # | 观察项 | 触发条件 | 复查时机 |
| - | ------ | -------- | -------- |
| O1 | 知识库(RAG)目录未建立 | 知识库特性 proposal 获批 | proposal 批准时加 `rag/`,复用 `adapters/` 通道 |
| O2 | 框架内建 service storage/message bus 与 ADR-0034 条款张力:`create_app` 要求传入 storage(RedisStorage/SQL)与 message bus,多进程需 RedisMessageBus——python「不持任何数据库连接」如何调和 | 承载 AI 会话能力的特性 design 盘点 service 组装参数时 | 特性 design 期裁定(与 ADR-0034 决策 4 同口径);若需修订条款走 adr_writing |

## 真源回写清单

| 真源文件 | 目标节 | 改动 |
| -------- | ------ | ---- |
| `docs/dev/代码目录.md` | 目录树 `agent-service/` 节 | 展开为裁决后的结构(main.py + 七目录),替换现有三行概述;边界与依赖规则入图注 |

---
title: ADR-0016：部署编排采用 Docker Compose
description: 单机自托管用 docker compose（v5.7.1）编排 app / PostgreSQL / Redis / SeaweedFS，Next.js standalone 镜像 + 反向代理，k3s / Swarm / Nomad / Coolify 等按运维比例否决
---

# ADR-0016：部署编排采用 Docker Compose

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 数据自持与自托管是既有约束（ADR-0005）：用户学习记录、资料与文件必须留在自有基础设施，排除 Vercel 等托管平台整体托管应用。
- ADR-0014（流式长连接的并发模型）与 ADR-0015（"部署形态大概率是单机 Docker Compose"）两处都把部署方案挂为待决策项——服务清单已经收敛为四个：Next.js 应用、PostgreSQL 17 + pgvector、Redis、SeaweedFS；单机全栈，暂无多机扩容需求。加上入口反向代理，compose 编排共五个服务。
- 团队规模小，延续"薄基础设施"取向（ADR-0014/0015 同一原则）：编排工具的运维成本必须与单机规模成比例。
- Docker 官方文档对目标形态有直接背书：[Use Compose in production](https://docs.docker.com/compose/how-tos/production/) 页面明确包含 "Running Compose on a single server" 一节，将 CI / staging / production 环境统一到同一份 Compose 定义。
- Next.js 16 官方自托管指南（node_modules/next/dist/docs，随仓库版本分发）建议：自托管应前置反向代理（处理慢连接、请求校验等），并支持运行时环境变量实现"单镜像多环境"。

## 决策

部署编排采用 Docker Compose（docker compose CLI 插件形态，原 Compose v2 形态，当前 v5.7.1），单机自托管。

- **拓扑**：一台 Linux 服务器，`compose.yaml` 编排五个服务——反向代理（TLS 终止与入口，具体实现 nginx / Caddy 在实施时定）、app、postgres、redis、seaweedfs；内部服务只绑 Docker 内网，唯一公网入口是反向代理。
- **应用镜像**：Next.js 启用 `output: 'standalone'`（官方配置）产出最小运行镜像；构建时不含环境变量，运行时注入，实现单镜像多环境（官方自托管文档背书）。
- **健康与依赖顺序**：postgres / redis / seaweedfs 定义 `healthcheck`，app 以 `depends_on: condition: service_healthy` 依赖三者，避免启动竞态。
- **数据面**：postgres 数据目录、SeaweedFS 卷目录（ADR-0015 已纳入备份计划）挂 host 卷；所有镜像钉住版本 tag：postgres 17.x、redis 7.x 钉到 minor 线（minor 内浮动可接受），seaweedfs 4.53 钉到 patch；compose 文件内禁止 `latest`，跨 minor 与大版本升级走显式变更评审（同 ADR-0013/0015 的钉版本纪律）。
- **机密管理**：`.env` 文件只存服务器本地不进仓库；LLM API 密钥仅注入 app 服务环境（ADR-0014 约束：密钥不进客户端 bundle）。
- **升级与回滚**：`docker compose pull && docker compose up -d`；回滚 = 改回上一个镜像 tag 再 up。不做蓝绿 / 金丝雀——单机规模下接受秒级停机窗口。
- **不做**：不上 Kubernetes / 多机编排；不引入 PaaS 面板；CI/CD 流水线（镜像构建与部署触发）是下一个独立决策（已由 ADR-0018 闭合）；应用服务保持无状态（状态全在 PG / Redis / SeaweedFS），为将来可能的编排迁移保留退路。反向代理具体选型（nginx / Caddy）与 TLS 证书管理作为部署实施期子项处理，不单独立 ADR（若将来涉及架构性取舍再立）。

## 备选方案

### k3s（轻量 Kubernetes）
- 优点：34,402 stars、Apache-2.0、活跃（v1.37.2+k3s1，2026-11-03 发布）；单二进制把完整 K8s 收进单机；将来扩容到多机是平滑路径。
- 缺点：控制面 / etcd / manifest / Helm 的概念与维护负担对单机四服务完全不成比例；排错要理解 K8s 自身的故障域。
- 否决原因：大炮打蚊子（与 ADR-0015 否决 Ozone/Ceph 同一理由）。多机需求出现时重评。

### Docker Swarm（swarmkit）
- 优点：内置于 Docker Engine，compose 文件可升级为 stack；学习成本低于 K8s。
- 缺点：社区面萎缩（moby/swarmkit 3,654 stars，对比 docker/compose 38,794）；"classic Swarm" 已被 Docker 官方废弃并于 v23.0 移除，Swarm mode 维持维护态但生态与教程存量持续走低。
- 否决原因：单机场景与 Compose 功能完全重叠，无多机需求前引入编排层只有成本没有增益。

### Nomad
- 优点：17,094 stars，单二进制、运维模型简洁，多年生产验证。
- 缺点：许可证为 Business Source License 1.1（BSL，经 GitHub license API 确认为非 OSI 认证的非标准许可证），与本项目一贯的 Apache-2.0 偏好冲突；又一层调度平面。
- 否决原因：协议不干净 + 单机无调度需求。

### Coolify / Dokploy（自托管 PaaS）
- 优点：Coolify（coollabsio/coolify，65,988 stars，Apache-2.0）极活跃，Web UI 一键部署、自动域名 / TLS / 反向代理，对独立开发者体验好。
- 缺点：PaaS 本身是又一层需要升级与守护的平台服务，把部署拓扑藏在 UI 后面；Dokploy（38,436 stars）核心仓库混入专有目录（许可证非标准，Apache-2.0 + /proprietary 混合）。
- 否决原因：五服务的拓扑用一份 compose 文件就能完整表达，"compose 文件即部署文档"比 UI 面板更符合当前规模；将来嫌手工部署麻烦时再评估（观察名单）。

### Podman + podman-compose
- 优点：rootless 架构安全性更好（33,246 stars，Apache-2.0，活跃）；无 root 守护进程。
- 缺点：Compose 兼容由第三方尽力而为，`docker compose` 的部分特性与插件生态存在兼容缝隙；与团队既有 Docker 心智不一致，CI 环境差异引入额外摩擦。
- 否决原因：收益（无 root 守护进程）与团队现状不匹配，兼容性摩擦是纯成本。

### 裸机 systemd 直跑
- 优点：零编排依赖，`next start` + 手工装 PostgreSQL / Redis / SeaweedFS。
- 缺点：环境漂移不可复现；升级回滚全手工；与 ADR-0015 已定的容器化假设冲突。
- 否决原因：不可复现的部署不能叫部署方案。

## 后果

### 正面
- 官方背书的目标形态：Docker 官方文档 "Use Compose in production" 直接覆盖 "Running Compose on a single server"（含 DOCKER_HOST 远程部署路径）；docker/compose 38,794 stars、Apache-2.0、当日有推送、v5.7.1 发布于 2026-11-11，迭代节奏稳定。
- 一份 `compose.yaml` 同时是部署单元与拓扑文档；开发环境与生产环境同一套编排语言，消减"本地能跑线上不能跑"。
- 与既有决策无缝：ADR-0015 的单机 SeaweedFS 假设、ADR-0014 待定的流式长连接部署问题（单机 Node 进程 + 反向代理，连接数容量可在单机上先行评估）都在本拓扑内闭环。
- 升级路径简单：钉版本 + pull + up，回滚是改一个 tag。

### 负面
- 单机即单点：应用升级有秒级停机窗口；服务器故障即全站故障。MVP 接受，多机需求出现时按 k3s 重评。
- Compose 的自愈只有进程级重启策略，没有健康驱动的重新调度；`restart: unless-stopped` 覆盖大部分场景但不是编排级保障。
- 反向代理的具体选型（nginx / Caddy）与 TLS 证书管理留在实施时定，是本决策内尚未闭合的小尾巴。

### 风险
- 数据面安全完全依赖备份纪律：postgres 定时 `pg_dump` + SeaweedFS 卷目录快照是上线硬性前置项，不是可选项。
- 升级破坏：所有镜像钉住版本 tag（postgres / redis 钉到 minor 线、seaweedfs 钉到 patch，compose 文件内禁止 `latest`），跨 minor 与大版本升级走显式 PR 评审（同 ADR-0013/0015 纪律）。
- 机密泄漏：`.env` 与 compose 文件分离，机密文件进 `.gitignore`；compose 配置变更纳入 code review 清单（同 ADR-0015 配置失误风险条款）。
- 多机迁移：应用服务保持无状态、状态全部外部化到 PG / Redis / SeaweedFS——这是把"将来迁 k8s"的成本压到最低的主动设计，写入部署评审清单。

## 相关决策

- [ADR-0001：全栈框架 Next.js 16](./nextjs-fullstack-framework)
- [ADR-0005：PostgreSQL 17 + pgvector](./postgresql-pgvector)
- [ADR-0007：Redis](./redis)
- [ADR-0013：认证与会话 Better Auth](./better-auth)
- [ADR-0014：LLM 接入层 Vercel AI SDK](./vercel-ai-sdk)
- [ADR-0015：对象存储 SeaweedFS](./seaweedfs)
- [ADR-0018：CI/CD GitHub Actions](./cicd-github-actions)
- [ADR-0019：可观测性后端 Grafana 栈](./observability-grafana-stack)
- [ADR-0023：错误上报 GlitchTip](./error-reporting-glitchtip)
- [ADR-0024：采集层 OpenTelemetry 标准](./telemetry-opentelemetry)

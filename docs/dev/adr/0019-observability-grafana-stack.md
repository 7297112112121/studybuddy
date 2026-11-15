---
title: ADR-0019：可观测性后端采用 Grafana 栈（Prometheus + Loki + Tempo + Grafana + Alloy）
description: 可观测性后端自托管 Grafana 栈——Prometheus 指标、Loki 日志、Tempo 追踪、Grafana 三支柱单面板与内置 SMTP 邮件告警（零新增通知组件）、Alloy ×2 采集；观测栈落 2核4G 机，日志追踪 7 天级、指标 30 天级保留；SigNoz/ClickStack/OpenObserve 按资源门槛否决，Victoria 栈为许可证姿态备胎
---

# ADR-0019：可观测性后端采用 Grafana 栈（Prometheus + Loki + Tempo + Grafana + Alloy）

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 可观测性（日志、指标、追踪）是待决策清单的最后一项。需求边界已由本轮确认：**可观测性数据必须自托管**（错误现场与 LLM 追踪会包含用户学习内容，ADR-0005 的数据自持约束同样适用）、**纯免费**（延续全链零持续成本取向）、**三支柱全做且含 LLM 链路追踪**（ADR-0014 的流式链路要能端到端复盘）、**告警走邮件**。
- 硬件事实（ADR-0018）：生产 4核4G、开发+测试共驻 2核4G，各 50GB 盘。
- 采集层标准见 ADR-0024，错误上报见 ADR-0023，二者各自独立成文；本 ADR 只决策可观测性**后端**栈。

## 决策

可观测性后端采用 **Grafana 栈**（自托管，部署延续 ADR-0016 的 Docker Compose），数据经 ADR-0024 的 OpenTelemetry 采集层汇入。

- **指标**：Prometheus（3.16.0，Apache-2.0）。两台服务器的主机与容器指标经采集器抓取；应用侧指标由 OTel 管道汇入。
- **日志**：Loki（3.7.9，AGPL-3.0）。选择其按标签索引的低成本模型（官方 README："It does not index the contents of the logs, but rather a set of labels for each log stream... designed to be very cost effective and easy to operate"）。
- **追踪**：Tempo（3.1.1，AGPL-3.0）。官方自述 "cost-efficient, requiring only object storage to operate, and is deeply integrated with Grafana, Prometheus, and Loki"——MVP 用本地文件系统存储，后续如需要可把存储后端切换到 ADR-0015 的 SeaweedFS（S3 兼容），不引入新组件。
- **面板与告警**：Grafana（13.3.1，AGPL-3.0）统一呈现三支柱并承担告警。告警通道用其**内置 SMTP 邮件**，零新增通知组件；规则集 MVP 覆盖：主机失联、5xx 错误率、磁盘水位、观测栈自身存活。
- **采集器**：Grafana Alloy（Apache-2.0）——两台服务器各跑一个轻量实例：生产机 Alloy 采集本机日志/指标并转发 OTLP；观测栈所在机器的 Alloy 兼管本机与 dev/test 环境。Alloy 具体版本于实施时按钉版本纪律（ADR-0013/0015）确定。
- **部署位置**：观测栈落在 **2核4G 服务器**（与 dev/test 三租户共驻，全部设内存限额）。核心理由：**监控必须比被监控对象活得久**——生产机整机故障时，告警链路要仍然存活并能发出"up == 0"告警，放生产机则同归于尽。
- **保留期纪律**：日志与追踪短保留（7 天级）、指标 30 天级，50GB 盘以保留期换空间。
- **不做**：SigNoz/ClickStack/OpenObserve 类一体化方案（资源形态见备选方案）；Langfuse 类专用 LLM 观测平台（AI SDK 的 OTel 遥测已覆盖 LLM 链路，无需为同一份数据再养一套重栈）；长期指标远端存储；自建面板。

## 备选方案

### SigNoz（一体化 APM）
- 优点：32,598 stars、当日有推送（v0.149.0，2026-11-04）；OpenTelemetry 原生，追踪/指标/日志/异常聚合一个产品全覆盖，正好命中"三支柱+错误+单一面板"；核心 MIT（ee/ 目录商业授权）。
- 缺点：官方 Docker 安装要求 "At least 4GB of memory allocated to Docker"——是 2核4G 整机的全部内存；ClickHouse 列式栈对单机小规模是重形态。
- 否决原因：官方资源门槛与本机硬件正面冲突；概念上是本项目最贴合的一体化选项，列入观察名单，未来换更大服务器时重评。

### ClickStack（原 HyperDX）
- 优点：10,030 stars、MIT、当日有推送；ClickHouse 一体化，日志/追踪/指标/错误外加会话回放。
- 缺点：同属 ClickHouse 重资源形态；仓库刚从 hyperdxio/hyperdx 迁移到 ClickHouse 组织，命名与治理正在动荡期。
- 否决原因：资源形态与 SigNoz 同病，且项目治理信号未稳。

### OpenObserve（单二进制一体化）
- 优点：23,028 stars、当日有推送；Rust 单二进制，日志+指标+追踪一体，部署面最小。
- 缺点：AGPL-3.0；面板生态与 Grafana 存量差距大；社区规模小于 Grafana 全家桶的任何一环。
- 否决原因：单二进制的运维吸引力不敌 Grafana 生态的成熟度与人才市场存量；作为"嫌组件多"时的备选记入观察名单。

### Victoria 栈（VictoriaMetrics + VictoriaLogs + Jaeger）
- 优点：全套 Apache-2.0，许可证姿态与既往偏好（ADR-0016 否决 BSL 的 Nomad）最干净；VictoriaLogs 自述 "lightweight, zero-config"；Jaeger 23,404 stars Apache-2.0。
- 缺点：三件套来自两个社区，面板仍绕不开 AGPL 的 Grafana；追踪-日志-指标在 Grafana 内的关联深度（exemplars、trace-to-logs）不如 Tempo/Loki 官方同门组合。
- 否决原因：功能等价但集成胶水更多；确认为**许可证姿态备胎**——若 AGPL 顾虑升级，此组合是原位替换路径。

### Langfuse（专用 LLM 观测平台）
- 优点：37,354 stars、当日有推送；prompt/trace/评估一站式，LLM 运营视角最细；核心 MIT（ee/ 商业目录）。
- 缺点：需要再养一套 ClickHouse + PG + Redis + 队列的重架构；而它要的 LLM span 数据，AI SDK 7 的 OTel 遥测已经原生产出并可导入 Tempo。
- 否决原因：为同一份数据复制一条管道，违背薄基础设施原则（ADR-0014/0015/0016 一贯取向）；trace 数据留在 Tempo，未来确有 prompt 调优需求时再单独立项。

## 后果

### 正面
- **三支柱单面板且数据不出自有设施**：观测栈与 LLM 追踪（含学习内容片段）全部落在腾讯云自有两台服务器，ADR-0005 的边界完整延伸到可观测性；Tempo/Loki/Prometheus 为官方同门组合，追踪-日志-指标在 Grafana 内的关联（exemplars、trace-to-logs）最深，Loki 的按标签索引模型压低日志成本。
- **告警零新增组件**：Grafana 内置 SMTP 邮件告警，MVP 不需要任何通知服务。
- 生态与安全干净：Grafana 77,859 / Loki 29,165 / Prometheus 67,574 stars 且当日均活跃；Prometheus、Alloy 为 Apache-2.0。

### 负面
- **组件数量是全栈选型里最多的一环**：Prometheus、Loki、Tempo、Grafana、Alloy ×2，加上错误上报侧的 GlitchTip + 专用 PG（ADR-0023），全链约 8 个容器，配置文件维护面显著大于任何单项选型；这是"自托管 + 三支柱 + 免费"三角的必然代价。
- **AGPL-3.0**：Grafana/Loki/Tempo 三件是 AGPL，与既往 Apache-2.0 偏好不同。内部自用、不对外分发、终端用户不接触监控面板，AGPL 的网络条款不实际触发——但如实记录此偏离，Victoria 栈为备胎。
- **2核4G 三租户共驻**：观测栈约需 1.5–2GB 内存限额，与 dev/test 挤同一台 4GB 机器，资源是最紧的物理约束；必要时需手动停 dev/test 容器换内存。
- **单监控点**：观测栈自身宕机时无外部拨测兜底，无人会发现"监控没了"——MVP 接受此盲区。
- 邮件告警依赖一个第三方 SMTP 账号，送达有时延。

### 风险
- **内存争抢**：以每服务内存限额、短保留期（日志/追踪 7 天级）为纪律，Grafana 面板同时观测观测栈自身指标；上线首周按实际水位调整限额。
- **跨服务器传输**：生产机到观测机的 OTLP/日志/指标流量走两台轻量服务器间的加密通道（内网直连或 WireGuard，实施时定）；秘钥同 ADR-0016 纪律，不进 CI。
- **50GB 盘保留期溢出**：Tempo/Loki 保留期配置错误会静默吃满磁盘，compactor/retention 配置纳入部署评审，配合磁盘水位告警双保险。

## 相关决策

- [ADR-0005：PostgreSQL 17 + pgvector（数据自持约束来源）](./postgresql-pgvector)
- [ADR-0014：LLM 接入层 Vercel AI SDK](./vercel-ai-sdk)
- [ADR-0015：对象存储 SeaweedFS（Tempo 未来对象存储选项）](./seaweedfs)
- [ADR-0016：部署编排 Docker Compose](./docker-compose)
- [ADR-0018：CI/CD 流水线 GitHub Actions（两台服务器拓扑）](./cicd-github-actions)
- [ADR-0023：错误上报 GlitchTip](./error-reporting-glitchtip)
- [ADR-0024：采集层 OpenTelemetry 标准](./telemetry-opentelemetry)

---
title: ADR-0023：错误上报采用 GlitchTip（Sentry 协议兼容自托管）
description: 错误上报用 GlitchTip（MIT）自托管 + 专用小型 PostgreSQL，SDK 用 @sentry/nextjs（1,630 万周下载）、DSN 指向自己服务器；Sentry 自托管按 16GB 内存硬件门槛否决，SaaS 按数据出境否决，纯日志方案丢失错误聚合体验
---

# ADR-0023：错误上报采用 GlitchTip（Sentry 协议兼容自托管）

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 本 ADR 由 ADR-0019 拆分而来，决策事实与证据均于 2026-11-12 确立。
- **错误现场含用户数据，必须自托管**：错误现场含用户邮箱、请求内容与学习记录片段，ADR-0005 的数据自持约束同样适用。
- Sentry 自托管在硬件层面直接关闭：官方最低要求是 **4 CPU、16 GB 内存 + 16 GB swap、20GB 磁盘**（推荐 32GB），并有 AVX2 CPU 要求与磁盘 I/O 门槛（"iowait > 10% of CPU time probably shows your system cannot handle the load"）——本项目两台服务器（生产 4核4G、开发+测试共驻 2核4G，各 50GB 盘）都无法承载。
- GlitchTip 官网自述："Our app is compatible with Sentry client SDKs, but easier to run"、"GlitchTip works with Sentry's open source client SDKs to receive error data from your application... Run it on your own server"——即用 1,630 万周下载的 `@sentry/nextjs` 做 SDK，错误数据落在自己服务器。
- 错误数据需要独立的持久化位置，且不能与会被测试重置的 dev/test 数据库耦合（ADR-0017 的测试库重置纪律）。

## 决策

错误上报采用 **GlitchTip（MIT）** 作为自托管错误聚合服务。

- **服务端**：GlitchTip 自托管，专用一个小型 PostgreSQL 实例（不与会被测试重置的 dev/test 库耦合，ADR-0017 纪律）。GlitchTip 具体版本于实施时按钉版本纪律（ADR-0013/0015）确定。
- **SDK**：`@sentry/nextjs`，DSN 指向自托管 GlitchTip。

## 备选方案

### Sentry 自托管
- 优点：错误上报功能最完整（官方定位 "the Business plan without any software limitations and no paid tier"），`@sentry/nextjs` 深度集成；9,652 stars，仓库仍活跃。
- 缺点：官方最低 **4 核 CPU + 16GB 内存 + 16GB swap**、AVX2、高 IOPS 盘；许可证为 FSL-1.1-Apache-2.0（非 OSI 认证，限制与 Sentry 竞争性使用）。
- 否决原因：两台服务器（4G/4G 内存）没有任何一台满足官方最低硬件要求，不构成可选项。

### Sentry SaaS 免费档
- 优点：零运维、免费档（5k 错误/月）对 MVP 足够；SDK 生态同一套。
- 缺点：数据存境外；错误现场即背景所述的用户敏感数据。
- 否决原因：用户已拍板可观测性数据必须自托管（ADR-0005 边界延伸）。

### 纯日志方案（不做错误上报，只留 Loki + 告警）
- 优点：组件最少；错误本质是日志的一行，Grafana 告警也能发现。
- 缺点：丢失错误聚合的专门体验（issue 分组、首次/最后出现、release 标记、用户维度聚合），排障效率明显下降。
- 否决原因：待决策清单明确要求错误上报；GlitchTip 的爆炸半径小、协议兼容 Sentry SDK，代价可接受。

## 后果

### 正面
- **错误数据不出自有设施**：错误现场落在腾讯云自有服务器，ADR-0005 的边界延伸闭合；`@sentry/nextjs` 经 OSV 查证 **0 条** 安全通告（2026-11-12）。
- **爆炸半径小**：GlitchTip 只是错误聚合的展示层，SDK 与服务端经开放协议解耦。

### 负面
- **GlitchTip 维护信号弱**：主仓库 199 stars、最后推送 2026-02-10（近 9 个月）。真停更可原位换任何 Sentry 协议兼容服务端，或退化为"Loki 日志 + Grafana 告警"（告警能力不依赖它，后端栈见 ADR-0019）。

### 风险
- **Sentry SDK 与 GlitchTip 协议兼容性为官方自述**，版本升级时可能存在短暂缝隙——`@sentry/nextjs` 钉版本，升级走显式 PR（同 ADR-0013/0015 纪律）。

## 相关决策

- [ADR-0005：PostgreSQL 17 + pgvector（数据自持约束来源）](./postgresql-pgvector)
- [ADR-0016：部署编排 Docker Compose](./docker-compose)
- [ADR-0017：E2E 测试 Playwright（测试库重置纪律）](./playwright-e2e)
- [ADR-0019：可观测性后端 Grafana 栈](./observability-grafana-stack)

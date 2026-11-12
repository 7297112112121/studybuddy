---
title: ADR-0015：对象存储采用 SeaweedFS
description: MinIO 因 AGPL 与主仓库归档出局，RustFS 安全披露密度过高暂缓，选 12 年成熟度的 SeaweedFS，应用层经 @aws-sdk/client-s3 走 S3 兼容 API + 预签名直传
---

# ADR-0015：对象存储采用 SeaweedFS

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 需求来自产品主链路：学习资料文件上传与存储（PDF / 文档 / 图片），以及 RAG 链路需要原文可追溯、留存入库的原文文件（产品需求：学习资料问答需能回溯原文出处，暂无独立文档承载；RAG 检索层选型见 ADR-0014）。文件本体进对象存储，元数据（对象 key、大小、上传者、资料关联）进 PostgreSQL（ADR-0005/0006）。
- 数据自持与自托管是既有约束（ADR-0005）：用户学习记录与资料属敏感数据，文件面必须留在自有基础设施，排除数据面托管在第三方 SaaS 的方案。
- **MinIO 出局是本次选型的前置约束**：MinIO 服务器以 AGPL-3.0 发布（仓库自述 "open sourced under GNU AGPLv3 license"），且主仓库 minio/minio 已归档（2026-11-12 经 GitHub API 查证：archived = true，最后推送 2026-04-24）——协议风险与社区版停更双重排除，新项目不可用。候选转向 rustfs、SeaweedFS 等 MinIO 替代方案。
- 团队规模小，部署形态大概率是单机 Docker Compose（部署编排已由同日 ADR-0016 正式决策），要求存储引擎运维面小：单二进制、少组件。
- 应用层要求：S3 兼容 API + 预签名 URL（浏览器直传不占 Node 进程带宽），上传链路定型后尽量不随存储引擎更换而改代码。

## 决策

对象存储采用 SeaweedFS（Apache-2.0，4.x，当前 4.53）。

- **部署形态**：单二进制 `weed`；MVP 单机一体化部署（master / volume / filer 同进程，S3 网关监听独立端口），一个容器跑完。多机副本（replication）留作扩容开关，MVP 单机 + 卷目录纳入备份计划。
- **应用访问面**：统一走 S3 兼容 API——`@aws-sdk/client-s3`（v3，npm 周下载 7,225 万）指向 SeaweedFS S3 endpoint，不引入私有 SDK；IAM 用官方 `s3.iam.json` 按 action 分权，业务读写与管理操作分持不同账号，具体账号划分留给实施文档。
- **上传链路**：Next.js 服务端签发 SigV4 预签名 PUT URL，浏览器直传对象存储；Drizzle 只写元数据。预签名互操作性有官方 wiki 文档背书（AWS CLI 与 SeaweedFS 端点互操作示例）。
- **桶规划**：学习资料、RAG 原文快照、用户导出分桶；对象 key 用不透明 ID，不依赖路径语义做权限边界。
- **暴露面收敛**：S3 网关与各内部端口（含 filer gRPC——GHSA-2v6v-25fm-p4fg 的教训）只绑内网，不开公网；admin 凭证不进应用环境变量。
- **不做**：MVP 不启用 FUSE / WebDAV 访问面，不引入跨机房多副本；存储引擎不进应用进程。

## 备选方案

### MinIO
- 优点：S3 事实标准与最大生态（minio npm 客户端周下载 119 万）；十年文档与社区沉淀（61,261 stars）。
- 缺点：服务器 AGPL-3.0，对可能的商业化演进构成传染与合规负担；主仓库 minio/minio 已归档（2026-04 后停更），minio 组织转入客户端 SDK（minio-go / minio-rs）与商业产品维护。
- 否决原因：协议变更 + 社区版停更，双重出局（用户明确约束新项目不使用）。

### RustFS
- 优点：Rust 实现、Apache-2.0、S3 原生兼容、定位 MinIO 直接替代；增长惊人（2023-11 建仓，35,999 stars 两年追平 SeaweedFS 十二年的积累）；1.0 稳定线 2026-09 起，当前 1.0.5（2026-11-10），一个月内连发 5 个版本，迭代极快。
- 缺点：**安全披露密度过高**：OSV / GitHub 通告库累计 13 条 GHSA（2025-12～2026-05 间发布），含 gRPC 硬编码令牌鉴权绕过、IAM 提权（两条独立 CVE）、multipart 跨桶对象外泄、控制台存储型 XSS 致管理员接管、明文记录敏感凭证；其中 2026-04 的两条（GHSA-mx42-j6wv-px98 medium、GHSA-pfcq-4gjr-6gjm high）在通告库中**无修复版本记录**；1.0 稳定线至今仅约两个月。
- 否决原因：存储层保管用户学习资料，属安全关键面，不押注在通告密度如此高、稳定线如此新的项目上。列入观察名单：1.x 稳定运营、通告密度回落、修复纪律确立后，按季度回顾机制重评。

### Garage
- 优点：Rust 实现，定位轻量，面向地理分布的横向扩展设计（数据三副本跨机房放置）。因仓库已不可访问，以上基于历史资料，无从复核。
- 缺点：仓库已不可访问（garagehq/garage 与 deuxfleurs/garage 均返回 404，2026-11-12 查证）；历史上以 AGPL-3.0 发布，与 MinIO 同样的协议排除。
- 否决原因：项目疑似停摆/迁移，且协议同属 AGPL。

### Apache Ozone / Ceph RGW
- 优点：Apache Ozone（Apache-2.0）活跃维护；Ceph 是业界标准，RGW 的 S3 兼容久经考验。
- 缺点：为大数据/云规模集群设计，组件多（Ozone 的 OM/SCM、Ceph 的 MON/OSD 全家桶），小团队单机 MVP 的运维成本与收益完全不成比例；Ozone 社区面窄（1,334 stars）。
- 否决原因：用大炮打蚊子，违背"薄基础设施"原则（ADR-0014 同一理由）。

### JuiceFS / lakeFS
- 优点：JuiceFS（14,728 stars，Apache-2.0）与 lakeFS（5,585 stars）均为活跃项目。
- 缺点：类别不符——JuiceFS 是 POSIX 文件系统（后端还要再接对象存储），lakeFS 是数据湖版本控制平面，两者都挂在对象存储**之上**，不提供存储本体。
- 否决原因：解决的不是本决策的问题。

### 本地文件系统
- 优点：零依赖零运维，MVP 最快路径。
- 缺点：无预签名 URL（浏览器直传要经应用中转，占用 Node 进程带宽与内存）；备份、扩容手工化；与单机强耦合，后期迁 S3 兼容存储要重写上传链路。
- 否决原因：上传链路早晚要走预签名直传，晚改不如早定；S3 API 才是可替换的稳定边界。

## 后果

### 正面
- 成熟度与活跃度兼得：2014 年建仓，十二年运营，36,031 stars，撰写当天仍有提交；最新版 4.53（2026-11-08）。
- 协议干净：Apache-2.0，无 AGPL 系协议的传染与合规负担，与选型前置约束一致。
- 运维面小：单二进制 `weed`，MVP 单容器，符合小团队"薄基础设施"取向。
- S3 兼容面可用性有据：预签名 URL（SigV4）与 IAM 分权均有官方 wiki 文档与 AWS CLI 互操作示例；应用层用标准 @aws-sdk/client-s3，存储引擎可替换。
- 存储模型匹配场景：Haystack 论文起家的小文件优化，适合"多用户、多资料、单文件中小体量"的学习资料分布。

### 负面
- S3 兼容由网关层实现而非原生语义，高级 S3 特性（加密、对象锁、部分 multipart 语义等）覆盖不全；应用层只用核心面（put / get / list / presign / multipart），新需求先验证再上。
- 架构分层（master / volume / filer / S3 网关）比"纯 S3 存储"概念多，排错需要理解内部拓扑；MVP 一体化部署可缓解。
- 安全披露 2026 年被集中检出 6 条（含未认证 IAM gRPC 致 S3 管理接管的 CVE-2026-72920），攻击面正被研究者盯上；与 ADR-0013（Better Auth 26 条通告）同理，「通告 → 升级」必须成为常规流程。
- 教程与 Stack Overflow 存量少于 MinIO，排错更依赖官方 wiki 与 GitHub issues。

### 风险
- 引擎绑定：应用只依赖 S3 兼容 API，数据是不透明 blob；若引擎失效或 RustFS 成熟（观察名单触发），迁移 = 桶同步 + 换 endpoint + 换凭证，不动应用代码。桶规划与 key 约定纳入评审，保持这扇门常开。
- 升级与通告：Compose 钉住版本号，CI 每周跑漏洞扫描（Trivy 扫仓库依赖与 Compose 配置；已部署镜像经 Dependabot docker 生态监听，见 ADR-0021）并把 seaweedfs 列为重点监听对象（同 ADR-0013 做法）。
- 配置失误：历史上多条通告与默认配置相关（如 IAM gRPC 未强制鉴权）。上线前对端口绑定、IAM 签名密钥、admin 凭证存放逐项评审，配置变更纳入 code review 清单。

## 相关决策

- [ADR-0001：全栈框架 Next.js 16](./nextjs-fullstack-framework)
- [ADR-0005：PostgreSQL 17 + pgvector](./postgresql-pgvector)
- [ADR-0006：Drizzle ORM](./drizzle-orm)
- [ADR-0013：认证与会话采用 Better Auth](./better-auth)
- [ADR-0014：LLM 接入层 Vercel AI SDK](./vercel-ai-sdk)
- [ADR-0016：部署编排采用 Docker Compose](./docker-compose)
- [ADR-0019：可观测性后端 Grafana 栈](./observability-grafana-stack)

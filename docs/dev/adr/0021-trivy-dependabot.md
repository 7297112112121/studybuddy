---
title: ADR-0021：安全扫描采用 Trivy 镜像门禁 + Dependabot 依赖监听
description: Trivy（锁定 0.76.2）以 --exit-code 1 阻断 HIGH/CRITICAL，.trivyignore 显式豁免；Dependabot 版本更新 + 安全告警管依赖；每周 scheduled Trivy fs 扫存量依赖与 Compose 配置
---

# ADR-0021：安全扫描采用 Trivy 镜像门禁 + Dependabot 依赖监听

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 本 ADR 由 ADR-0018 拆分而来，决策事实与证据均于 2026-11-12 确立。
- 流水线（ADR-0018）需要两道安全闸：**镜像门禁**——高危漏洞镜像在推仓库前阻断；**依赖告警**——存量依赖与已部署基础设施镜像的漏洞通告要有常态化监听。
- TCR 个人版**无内置镜像安全扫描**（官方文档将安全扫描列为 TCR 企业版功能，前提"已成功购买企业版实例"，ADR-0020）——扫描必须在流水线内自建。
- 依赖侧并非杞人忧天：ADR-0015 记录 SeaweedFS 2026 年被集中检出 6 条安全披露（含未认证 IAM gRPC 致 S3 管理接管的 CVE-2026-72920），ADR-0013 记录 Better Auth 26 条通告——「通告 → 升级」必须成为常规流程，监听面要先立起来。
- 开源项目零持续成本取向：扫描工具链必须免费——Trivy 为 Apache-2.0 开源扫描器，Dependabot 为 GitHub 内置功能，均无费用；扫描报告随流水线运行记录留存，可在 Actions 历史中追溯，免费不牺牲可审计性。
- ADR-0015 承诺"CI 每周扫描 + seaweedfs 列为重点监听对象"、ADR-0013 承诺"CI 每周跑 `npm audit` 与 OSV 扫描，把 better-auth 列为重点监听对象"——两者在实施上均由本决策的机制承担：Trivy 漏洞库周扫锁文件与 Compose 配置、Dependabot 告警管 npm 依赖（better-auth 属锁文件内依赖，自动落在监听面，无需单独点名）。

## 决策

安全扫描采用 **Trivy 镜像门禁 + Dependabot 依赖监听**，全链路零成本。

- **镜像层：Trivy**（aquasecurity 官方 `trivy-action`，Trivy 锁定 0.76.2）扫构建产物，`--exit-code 1` 阻断 HIGH/CRITICAL；扫描步骤位于构建之后、推仓库之前（ADR-0018 流水线第 2 层）——高危镜像到不了仓库，更到不了服务器；无法立即修复的进 `.trivyignore` 显式豁免并注明原因。
- **依赖层：Dependabot** 版本更新 + 安全告警（Free 计划含"Dependabot security and version updates"，官方定价页）。
- **每周 scheduled 作业**跑 Trivy fs 扫描仓库存量依赖与 Compose 配置——门禁只看新增，存量漏洞靠周扫兜底，公共仓库 Actions 分钟免费（ADR-0018）使周扫零成本；ADR-0015 所述"OSV 扫描"在实施上由 Trivy 漏洞库承担（数据源覆盖 NVD / GHSA 等），osv-scanner 已列入观察名单作纯 OSV 源补充。
- **已部署基础设施镜像的监听**由 Dependabot docker 生态版本更新承担——监控 compose.yaml 中钉版本的镜像（seaweedfs 为重点监听对象），新通告触发显式评审（钉版本纪律，"通告 → 升级"同 ADR-0013 常规流程）。

## 备选方案

### 安全扫描：Grype
- 优点：Apache-2.0，13,247 stars，活跃（2026-11-11 有推送）。
- 缺点：社区规模约为 Trivy 的 1/3；扫描面以镜像为主，SBOM / IaC 覆盖窄于 Trivy。
- 否决原因：同为优秀扫描器，选型收敛到扫描面更广、社区大三倍、官方 action 同源维护的 Trivy。

### 安全扫描：osv-scanner（Google）
- 优点：Apache-2.0，11,500 stars，OSV 数据源纯净。
- 缺点：定位以依赖 / SBOM 扫描为主，镜像原生扫描非强项。
- 否决原因：镜像门禁需要镜像原生扫描器；依赖层已由 Dependabot 覆盖。列入观察名单作未来补充。

### 安全扫描：TCR 内置安全扫描
- 优点：企业版内置（基于开源 Clair，CVE 库定期同步，支持命名空间级自动扫描）。
- 缺点：官方文档明示前提为"已成功购买企业版实例"，个人版不可用。
- 否决原因：不为扫描买企业版——扫描放流水线内做，免费且报告可追溯。

## 后果

### 正面
- **安全闭环零成本**：Trivy（Apache-2.0）+ Dependabot（Free 计划含）+ 每周复扫，兑现 ADR-0015 承诺；镜像门禁嵌在 ADR-0018 流水线内，高危镜像到不了仓库更到不了服务器。
- 依赖与镜像两层互补：Trivy 管构建时（新镜像 + 仓库存量），Dependabot 管运行时（已部署镜像的通告）——两个时间面都有人值守。

### 负面
- `.trivyignore` 豁免清单、Dependabot 的 ecosystem 配置与扫描器锁版本是新的维护面——豁免必须注明原因，扫描器版本随季度回顾升级。

### 风险
- **第三方 action 供应链**：Trivy 生态 2026 年发生过"supply chain was briefly compromised"的官方通告（OSV GO-2026-4919 / GHSA-69fq-xp46-6x23，修复于 0.70.0）——全部 action 钉完整 commit SHA（纪律见 ADR-0022）。
- **Trivy 自身通告**：OSV 收录 10 条（均含修复版本，当前 0.76.2 已全部覆盖）；扫描器是 runner 内短生命周期进程，锁版本 + 季度升级可控。

## 相关决策

- [ADR-0013：认证与会话 Better Auth](./better-auth)
- [ADR-0015：对象存储 SeaweedFS](./seaweedfs)
- [ADR-0016：部署编排 Docker Compose](./docker-compose)
- [ADR-0018：CI/CD 流水线 GitHub Actions](./cicd-github-actions)
- [ADR-0020：镜像仓库采用腾讯云 TCR 个人版](./tencent-tcr-registry)
- [ADR-0022：CI 机密管理分环境隔离与三层分界](./ci-secrets)

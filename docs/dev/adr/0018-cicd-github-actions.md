---
title: ADR-0018：CI/CD 流水线采用 GitHub Actions
description: 三层触发晋升——PR 校验、push master 自动部署开发与测试环境、push tag v* 经 production 环境 required reviewers 人工放行部署生产；三环境映射两台服务器，原生 ssh 部署、失败即中止、回滚重放历史 tag 部署作业
---

# ADR-0018：CI/CD 流水线采用 GitHub Actions

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 两个既有决策把本决策挂了账：ADR-0016 明确"CI/CD 流水线（镜像构建、推送与部署触发）是下一个独立决策"；ADR-0017 把测试环境编排（runner 内 PG / Redis / SeaweedFS 的拉起方式）留待本决策闭合。ADR-0015 承诺的"CI 每周扫描"由 ADR-0021 闭合。
- **仓库是 GitHub 公共仓库**（github.com/7297112112121/studybuddy，开源项目，2026-11-12 经 gh 查证 visibility = PUBLIC）。这一事实决定性地解锁了两个前提：GitHub Actions 对公共仓库**分钟数免费**；GitHub Environments 与 required reviewers 保护规则在公共仓库**对所有计划可用**（官方文档原文），生产放行门禁不需要任何付费升级。
- 部署面：两台腾讯云轻量应用服务器（2核4G 与 4核4G，各 50G 存储、300G/月流量），跑 ADR-0016 定下的单机 Compose 拓扑（app / postgres / redis / seaweedfs + 反向代理）。业务要求分**开发、测试、生产**三环境。
- **待定项由本决策闭合：触发晋升机制、三环境到两台服务器的映射、部署通道**。镜像仓库选型见 ADR-0020，安全扫描见 ADR-0021，CI 机密管理见 ADR-0022，三者各自独立成文。

## 决策

CI/CD 流水线采用 **GitHub Actions**（仓库原生，公共仓库免费）。

- **触发与晋升**：分层自动化，生产自动触发、人工放行：
  1. **PR** → lint + typecheck + Vitest（ADR-0012）+ 生产构建 + Playwright E2E（ADR-0017；PG / Redis / SeaweedFS 以 runner 内临时 Compose 栈拉起，对构建产物跑）——不推镜像、不部署、零机密接触（分界见 ADR-0022）；
  2. **push master** → 构建 standalone 镜像（ADR-0016 多阶段构建）→ 安全门禁（ADR-0021）→ 推镜像仓库（ADR-0020，tag = 短 SHA）→ **自动部署开发环境 → 开发健康检查通过后自动部署测试环境**；
  3. **push tag v\*** → 同管道附加 semver tag → 生产部署作业绑定 GitHub **production 环境**（required reviewers 人工放行，支持禁止自批；deployment branch 规则限定仅 `v*` tag 可触发）→ 部署生产。
  - 同环境并发部署用 concurrency 组 + `cancel-in-progress: true`，新部署取消旧部署避免堆积。
  - **环境映射**：4核4G 独占生产；2核4G 跑开发 + 测试两个 Compose project（不同端口与子域，经反向代理区分，内存限额防互抢）。质量门在 CI runner 内的 E2E 完成，部署后的开发/测试环境供联调验收，不是质量门。
- **部署动作**：CI 用**原生 ssh**（密钥为 environment secret，见 ADR-0022）登服务器完成镜像拉取、数据库迁移与滚动更新；失败即中止，上一版本继续运行，**回滚 = 重放历史 tag 的部署作业**。基础设施镜像版本钉死（ADR-0016 禁 latest 纪律），只有 app 镜像 tag 随部署滚动。
- **不做**：不自建 runner（公共仓库分钟免费，无成本动因；自托管 runner 引入供应链与运维面）；不上 GitOps（Argo CD / Flux 需要 k8s，与 ADR-0016 拓扑不匹配，迁 k8s 时重评）；不做蓝绿/金丝雀（ADR-0016 已接受秒级停机窗口）；不引入 Watchtower 类自动追新镜像（违反钉版本纪律）。

## 备选方案

### CI 平台：GitLab CI
- 优点：功能当量、runner 模型成熟、自托管可选。
- 缺点：代码托管在 GitHub（gh 查证），引入 GitLab CI 意味着双仓库镜像或整体迁移；双平台零增益。
- 否决原因：Actions 与仓库、PR、分支保护规则原生一体，集成成本为零是硬优势。

### CI 平台：Jenkins
- 优点：生态与插件存量最大。
- 缺点：自托管 Java 服务 + 插件升级运维，与两台轻量服务器的规模完全不成比例（ADR-0016 否决 k3s 同款理由）。
- 否决原因：免运维的原生方案在前，不为当量功能引入运维面。

### CI 平台：Woodpecker / Drone（自托管轻量 CI）
- 优点：单二进制轻量部署。
- 缺点：又一个要升级守护的生产服务（ADR-0016 否决 Coolify 同款理由）；公共仓库还要暴露回调端点。
- 否决原因：薄基础设施原则。

### CI 平台：腾讯云 CODING CI
- 优点：与部署面同在腾讯云，国内网络亲和。
- 缺点：商业 SaaS；代码在 GitHub，引入即双仓库；个人版额度受限。
- 否决原因：CI 平台不需要与部署云同源——部署侧对腾讯云的全部依赖只是 SSH 与镜像拉取，Actions 都能满足。

### 部署通道：appleboy/ssh-action（第三方 SSH action）
- 优点：MIT，6,239 stars，社区最大的 SSH 部署 action。
- 缺点：**个人仓库维护的第三方 action**，引入供应链面（最后推送 2026-08-16，近三个月）；官方安全指南要求钉 SHA 的存在本身说明第三方 action 风险的普遍性。
- 否决原因：原生 ssh 功能当量、零供应链；官方组织的 action（docker / aquasecurity）保留并钉 SHA，个人组织的 action 一律不引。

## 后果

### 正面
- **流水线零新增服务、零持续成本**：公共仓库 Actions 分钟免费，镜像仓库零成本（ADR-0020）——唯一成本是既有的两台服务器。
- 三环境晋升全可追溯：PR 检查 → 自动开发 → 自动测试 → tag + 人工放行生产；Environments 的 required reviewers（"up to 6 people or teams. Only one of the required reviewers needs to approve"）与"仅 `v*` tag 可部署"规则均为官方原生功能，公共仓库全计划可用——无任何自建审批服务。
- ADR-0017 挂账的测试编排以 runner 内临时 Compose 栈闭环，不留尾巴。

### 负面
- 两环境共驻 2核4G：开发/测试互抢 CPU 与内存（以容器内存限额压制）；50G 磁盘放两套 PG / SeaweedFS 数据与镜像缓存，余量需要盯。
- E2E + 多阶段镜像构建在公共 runner 上排队时间不可控；PR 全跑 E2E 会拖慢反馈（后续可按目录变化裁剪 E2E 触发面）。
- 流水线 YAML 本身成为新的维护面（workflow 拆分、缓存治理）。

### 风险
- **GitHub 单点**：Actions 故障 = 部署通道中断；runbook 保留服务器端手工 `pull && up -d` 步骤（compose 文件即部署文档，ADR-0016 的优势）。
- **fork PR 恶意触发的作业**：PR 校验作业不引用任何 environment secret、不推镜像不部署——即使被恶意触发，接触面为零（机密分界见 ADR-0022）。

## 相关决策

- [ADR-0012：单元测试 Vitest](./vitest)
- [ADR-0015：对象存储 SeaweedFS](./seaweedfs)
- [ADR-0016：部署编排 Docker Compose](./docker-compose)
- [ADR-0017：E2E 测试 Playwright](./playwright-e2e)
- [ADR-0020：镜像仓库采用腾讯云 TCR 个人版](./tencent-tcr-registry)
- [ADR-0021：安全扫描采用 Trivy + Dependabot](./trivy-dependabot)
- [ADR-0022：CI 机密管理分环境隔离与三层分界](./ci-secrets)

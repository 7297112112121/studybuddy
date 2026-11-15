---
title: ADR-0022：CI 机密管理采用分环境隔离与三层分界
description: CI 只持部署最小面——TCR 凭证 + 每台服务器 SSH key，按 GitHub environment 分环境存放，production 叠加 required reviewers 人工放行；应用运行时机密零过 CI；GITHUB_TOKEN 最小权限、第三方 action 钉完整 commit SHA
---

# ADR-0022：CI 机密管理采用分环境隔离与三层分界

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 本 ADR 由 ADR-0018 拆分而来，决策事实与证据均于 2026-11-12 确立。
- **仓库是 GitHub 公共仓库**（ADR-0018 经 gh 查证 visibility = PUBLIC）：任何人可 fork 并提 PR，校验作业要跑不可信代码，机密必须对其不可见——这是三层分界的直接动因，机密的存放与授权边界是流水线的安全地基。GitHub Environments 与 required reviewers 保护规则在公共仓库**对所有计划可用**（官方文档原文），分环境隔离不需要任何付费升级。
- ADR-0016 已确立应用机密只存服务器本地 `.env` 的纪律；CI 侧需要同款纪律的延伸：哪些机密进 CI、进哪个环境、第三方 action 信不信。
- CI 实际需要持有的机密清单很短：TCR 登录凭证（ADR-0020，固定密码模型）+ 每台服务器各一把 SSH key——机密面本身小，更没有理由放松边界；「哪些机密进 CI」的答案是封闭集合，任何新增机密都要过一次显式评审。三环境到两台服务器的映射（ADR-0018）天然对应 dev / test / prod 三个 environment，分环境存放零额外建模。

## 决策

CI 机密管理采用**分环境隔离 + 三层分界**，核心原则是**应用运行时机密零过 CI**：

1. **CI 只持部署最小面**：TCR 登录凭证（ADR-0020，固定密码模型）与每台服务器的 SSH key，**按 GitHub environment 分环境存放**（dev / test / prod 各自持有自己服务器的 key，secret 仅在绑定该环境的作业中可见），production 环境叠加 required reviewers 人工放行（支持禁止自批）；
2. **应用运行时机密**（LLM API key、数据库密码）**只存服务器本地 `.env`**（ADR-0016 纪律延伸），流水线不复制、不渲染、不经过——CI 被攻破的爆炸半径 = TCR 推送凭证 + 部署 SSH key，两者皆可轮换；
3. **`GITHUB_TOKEN` 最小权限**（`permissions` 只授所需）；第三方 action 一律**钉完整 commit SHA**（官方安全指南："Pin actions to a full-length commit SHA…mitigate the risk of a bad actor adding a backdoor"）；非组织级官方仓库的 action 不引入，action 白名单收敛到官方组织（docker / aquasecurity）——部署用原生 ssh（ADR-0018），不用第三方 SSH action。

## 备选方案

### 机密管理：仓库级 secrets（不分环境）
- 优点：配置最简、零新增概念，所有 secret 集中一处。
- 缺点：所有环境共用同一把 SSH key 与凭证，生产密钥暴露面扩大到每次 push 触发的作业；无审批门禁可用。
- 否决原因：公共仓库下 Environments 免费、原生支持分环境隔离与 required reviewers，没有理由不用。

### 机密管理：腾讯云凭据管理系统 SSM
- 优点：云原生托管、集中轮换。
- 缺点：机密面迁到云端，但 CI 仍需凭证访问 SSM，暴露面未收敛；应用运行时机密本就不过 CI，托管收益薄。
- 否决原因：多引入一个云服务，解决的是不存在的问题。

### 机密管理：HashiCorp Vault
- 优点：动态机密与自动轮换成熟，业界事实标准。
- 缺点：Business Source License 1.1 非标准许可证（ADR-0016 否决 Nomad 同款理由）+ 自托管服务运维面。
- 否决原因：许可证 + 运维面双杀。

## 后果

### 正面
- **爆炸半径收敛**：CI 被攻破只损失两个可轮换凭证（TCR 推送凭证 + 部署 SSH key）；生产部署多一道 required reviewers 人工放行。
- 分环境隔离使 dev / test 的部署凭证与生产密钥物理分离——低环境凭证泄漏不波及生产；应用机密（LLM API key、数据库密码）全程不出服务器，与 ADR-0016 的 `.env` 纪律首尾相接，审计时只看服务器一处。

### 负面
- 多环境 secret 的维护与轮换成本：每环境各自配置，不能一处修改全局生效；environment 与 secret 的对应关系需要写入 runbook，避免配置漂移。GitHub secret 值写入后不可导出回读，配置错误只能删除重建。

### 风险
- **fork PR 恶意触发的作业**：PR 校验作业不引用任何 environment secret——即使被恶意触发，机密接触面为零。
- TCR 固定密码与部署 SSH key 无自动轮换；季度轮换入回顾清单。机密清单短（一个 registry 凭证 + 每台一把 key），轮换操作量可控。

## 相关决策

- [ADR-0016：部署编排 Docker Compose](./docker-compose)
- [ADR-0018：CI/CD 流水线 GitHub Actions](./cicd-github-actions)
- [ADR-0020：镜像仓库采用腾讯云 TCR 个人版](./tencent-tcr-registry)
- [ADR-0021：安全扫描采用 Trivy + Dependabot](./trivy-dependabot)

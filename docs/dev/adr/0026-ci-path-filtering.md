---
title: ADR-0026：CI 按变更路径裁剪，流程控制件采用 dorny/paths-filter
description: PR 校验与 push master 部署两条流水线引入 dorny/paths-filter v4 做变更检测与 job 级裁剪——兜底式跳过（未命中显式清单一律全跑）、可观测留痕进 job summary、部署层跳过仅限镜像产物无差异清单并设漂移防线；同时修订 ADR-0022 的 action 白名单条款
---

# ADR-0026：CI 按变更路径裁剪，流程控制件采用 dorny/paths-filter

## 状态

已接受（Accepted）

## 日期

2026-11-19

## 背景

- ADR-0018 负面后果挂账「后续可按目录变化裁剪 E2E 触发面」，本决策闭合这笔账。
- **现状痛点**：ci.yml 的 PR 校验对**所有 PR 全量跑**（lint + typecheck + 单测 + 集成 + E2E + 生产构建 + Docker 可构建性校验），docs-only 或纯 Markdown 改动的 PR 也要付 Chromium 安装 + E2E + 双重构建的时间成本，反馈约 15–20 分钟；而这类变更对 app 产物零影响。deploy.yml 同病：**docs-only 的 push master 也会全量重建镜像、推 TCR 并滚动重启 dev / test 两套环境**——镜像内容与上一版完全相同，纯耗时且每次向 TCR 推一个冗余镜像。
- **原生能力不够用**：`on.<event>.paths` 只能决定**整个 workflow** 触发与否，无法在同一 workflow 内对 verify 与 docker 两个 job 分别裁剪；且 workflow 整体被 paths 过滤掉时，分支保护的必需检查（verify、Docker build 已录入 master）会永远 pending 卡住合并。docs.yml 已用原生 `paths:` 做整 workflow 级过滤——那是它能覆盖的场景，本决策针对的是 job 级场景。
- **第三方 action 引入受 ADR-0022 约束**：其决策 3 明文「action 白名单收敛到官方组织（docker / aquasecurity）」，而本决策选定的 dorny/paths-filter 是个人组织（dorny）维护的第三方 action。引入它必须显式修订该条款（见决策 5），这正是本 ADR 与 ADR-0022 修订联动的原因。
- 选型事实（2026-11-19 经 gh 查证）：dorny/paths-filter，MIT 许可证，3.4k stars，未归档，最后推送 2026-09-27（活跃维护），当前 v4（v4.0.3）；GitHub 社区事实标准的变更检测 action。

## 决策

PR 校验（ci.yml）与 push master 部署（deploy.yml）两条流水线引入 **dorny/paths-filter v4 作为变更检测与流程控制件**，按变更路径裁剪 job：

1. **变更检测作业**：ci.yml 与 deploy.yml 各自新增 `changes` 作业（最先执行，零机密、`permissions: contents: read`），以 paths-filter 定义路径过滤器并输出各过滤器命中布尔值；下游作业改为 `needs: changes` + job 级 `if` 按命中结果裁剪。
2. **兜底式裁剪原则（黑名单跳过，不是白名单运行）**：只有显式命中「无影响」路径清单才允许跳过对应作业；**未命中任何规则、规则集自身（.github/**、filters 定义）、依赖清单（package*.json、lock 文件）变更一律全跑**。宁可漏跳、不可漏跑。
3. **裁剪落面：PR 层 + push master 层**：
   - **ci.yml（PR 校验）**：verify 与 docker 仅在显式命中「对 app 产物无影响」清单（docs/**、website/**、*.md 等）时跳过；
   - **deploy.yml（push master 晋升链 build → scan → push → dev → test）**：仅当变更显式命中「镜像产物无差异」清单（docs/**、website/**、*.md 等，docs 站点由 docs.yml 独立发布）时跳过全链；命中任何 app 相关路径（src/**、package*.json、Dockerfile、compose、scripts/deploy.sh、.github/workflows/deploy.yml 自身等）一律全量晋升。
   - **漂移防线**（部署层裁剪的专属前提）：跳过的 push 在 job summary 留痕「本次 push 未部署 + 命中清单」；`workflow_dispatch` 手动通道保留为兜底重放入口；运行时镜像内容与 master 代码不漂移——docs 变更不进 standalone 镜像产物（ADR-0016），任何 app 相关提交必然触发全量部署。
4. **可观测留痕**：`changes` 输出与 `list-files` 命中文件清单写入 job summary，每次运行留下「命中 code=true / docs=false → 全量校验/部署」的可见审计痕迹，部署层跳过同样留痕可查。
5. **对 ADR-0022 决策 3 的显式修订**：action 白名单默认仍收敛到官方组织，**例外须经显式 ADR 评审**（背景、风险、缓解面齐备）方可引入个人组织 action。本次例外：`dorny/paths-filter@ceb8a2b8f2d89434be7ff52d3de7ec3738c5cc9d`（v4，钉完整 commit SHA），缓解面：钉 SHA + 只读 token + 零机密接触（PR 校验作业不引用任何 environment secret）+ release 变更升级走显式评审。部署用原生 ssh（ADR-0018）的纪律不变。

## 备选方案

### 原生 `on.pull_request.paths` / `paths-ignore`
- 优点：零第三方依赖，docs.yml 已有使用先例。
- 缺点：只能控制整个 workflow 触发与否，同 workflow 多 job 无法分别裁剪；整体跳过时必需检查 pending 卡合并，需额外配套处理。
- 否决原因：job 级粒度与必需检查兼容性都不是它的能力面；整 workflow 级场景继续由原生 paths 承担（docs.yml 不动）。

### 拆分 workflow 文件 + 各自原生 paths
- 优点：不引第三方 action。
- 缺点：verify 拆文件后 checkout / setup-node / npm ci 重复执行，维护面翻倍；必需检查 pending 问题同样存在。
- 否决原因：为避免一个 action 付出双倍维护成本，不划算。

### 手写 `git diff --name-only` 脚本
- 优点：零第三方依赖，逻辑透明。
- 缺点：merge-base 计算、fork PR 的 diff 获取、文件状态（增/删/改）过滤、fetch 深度边界都要自维护，重复造 paths-filter 已解决的轮子。
- 否决原因：自维护脚本同样是长期供应链与正确性负担，且无可观测输出生态。

### 不引入（维持 PR 全量）
- 优点：零新增风险面。
- 缺点：docs-only PR 持续付全量时间成本；ADR-0018 挂账不闭合。
- 否决原因：裁剪收益明确且兜底原则可控质量风险，挂账应当闭合。

### 裁剪仅落 PR 层（deploy 晋升链不动）
- 优点：零部署漂移风险，改动面最小。
- 缺点：docs-only push 仍全量重建镜像 + 双环境滚动重启，与 PR 层浪费同源；每次推内容相同的镜像占用 TCR 存储。
- 否决原因：deploy 层跳过仅限「镜像产物无差异」的显式清单，配留痕与手动重放兜底后漂移风险可控；两层浪费同源，一次闭合。

## 后果

### 正面
- docs / 配置类 PR 的 CI 从约 15–20 分钟降到秒级出结果；src 类 PR 行为不变，零质量损失。
- docs-only push 不再重建镜像、推冗余镜像与滚动重启 dev / test，部署流水线分钟级节省且 TCR 存储不再累积无差异镜像。
- 每次运行的变更命中结果与命中文件清单留痕 job summary，裁剪决策可审计、可复盘。
- ADR-0022 的白名单条款获得一条可复用的例外通道（显式 ADR 评审），后续引第三方 action 有章可循。

### 负面
- 新增一个第三方 action 的供应链面（个人组织维护），需在季度回顾中核对其 release 与安全通告。
- workflow YAML 复杂度上升：changes 作业 + needs/if 链 + 过滤器定义成为新的维护点。
- 过滤器规则与仓库目录约定（docs/dev/代码目录.md）耦合，新增顶层目录时须同步规则。

### 风险
- **skipped job 与必需检查的语义需实测**：job 级 `if` 跳过的作业在分支保护下应计为通过（官方文档口径），但需在 master 分支保护配置上实际验证；若不认可 skipped 状态，回退方案是恢复全量或将 verify/docker 拆为独立 workflow。
- **部署层误判导致漏部署**：push master 的变更被误判为「镜像产物无差异」而跳过晋升，master 与线上产生真实漂移——以兜底清单压制（清单只收确认不进 standalone 镜像的路径，新路径入清单须经核实）；job summary 留痕 + `workflow_dispatch` 手动重放兜底；漏部署事故入回顾清单。
- **产物边界漂移**：若未来 docs / website 文件开始影响 app 运行时产物（如运行时读取 docs），「镜像产物无差异」前提失效——新顶层目录或产物结构变更时须回读本 ADR 核对清单（速查表已登记信号）。
- **过滤器漏路径导致漏检**：以兜底原则压制——未知路径全跑、filter 自身与 .github/** 变更强制全跑；漏检事故入回顾清单修订规则。
- **上游行为变更**：paths-filter 的 REST API 依赖或匹配语义变化——已钉 SHA，升级必须显式评审并重跑验证。

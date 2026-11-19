# 技能目录（唯一真实来源）

本目录（`.agents/skills/`）是本项目 AI 技能的**唯一真实来源**。各 AI 工具目录一律通过 symlink 引用，不得复制副本：

```
.claude/skills → ../.agents/skills
.codex/skills  → ../.agents/skills
.dsh/skills    → ../.agents/skills
```

> **Windows 注意事项**：Git symlink 在 Windows 下需要系统开启「开发者模式」，并执行 `git config core.symlinks true`；否则 checkout 出来的 symlink 会退化为普通文本文件，技能加载会静默失效。

## 技能清单

目录为扁平结构，按研发流程组织技能：流程技能分属产品设计 / 开发落地 / 测试提质，另设横切 / 变更管理分组（不在单向流内，任意阶段可触发）；外部技能以依赖形式安装，由根目录 `skills-lock.json` 锁定版本。

### 流程技能（本地维护）

| 分组 | 技能 | 职责 | 输入 → 输出 |
| --- | --- | --- | --- |
| 产品设计 | `product_design/` | 将模糊想法转换为用户故事 | 模糊想法 → 用户故事（docs/product，五大组成部分） |
| 产品设计 | `product_proposal_writing/` | 用户故事 → 需求规范 | 已批准用户故事 → proposal（批准门一；docs/product/AXY-<N>-<slug>/，含原型契约） |
| 开发落地 | `dev_architecture_design/` | 需求规范 → 架构设计 | 已批准 proposal → design（批准门二） |
| 开发落地 | `dev_plan_writing/` | 架构设计 → 实现计划 | 已批准 design → tasks（微任务 + TDD） |
| 开发落地 | `dev_implementation/` | 按已批准实现计划逐任务 TDD 执行 | 已批准 tasks → 产品代码 + 测试 + evidence 落盘 |
| 开发落地 | `dev_spec_review/` | 实现完成后的规范终审（可选，由用户显式决定是否触发） | proposal + 实现产物 → review 报告 |
| 横切 / 变更管理 | `feature-supersede/` | 已合并主分支特性的推翻 / 取代 / 废弃 | 旧全部工件 + 现有代码 → 定级 + 重新批准 + 代码处置（revert / tag）+ 墓碑 + 变更记录（第五份工件） |
| 横切 / 工程操作（轻量） | `branch-wrapup/` | 工作分支合并收尾 | 已完工工作分支 → PR（含提交错误处置）→ squash merge → 清理本地/远程分支 → 切回 master 拉新 |
| 测试提质 | （暂缺） | 测试提质阶段的质量加固 | 暂不编写 |

### 外部技能（skills-lock.json 管理）

| 技能 | 来源 | 用途 |
| --- | --- | --- |
| `better-auth-best-practices/` 等 6 个 | [better-auth/skills](https://github.com/better-auth/skills) | Better Auth 集成、安全、组织、2FA 等场景的最佳实践 |
| `frontend-design/` | [anthropics/skills](https://github.com/anthropics/skills) | UI 视觉设计手法（美学方向、排版、去模板化默认）；token 纪律与组件选型仍以 [前端设计规范](shared/前端设计规范.md) 为准 |
| `prompt-alchemist/` | [Cherish133/prompt-alchemist](https://github.com/Cherish133/prompt-alchemist) | 提示词蒸馏优化（四元蒸馏框架：诊断 → 结构 → 思考 → 压缩，自动改写用户 Prompt） |

外部技能不得手改（改动会与锁文件 hash 冲突）；升级或卸载走 skills-lock.json 对应的安装流程。

## 总流程与分支生命周期（唯一真源）

### 总流程

```text
（master）
 ├─ docs/<slug> 分支（产品侧）
 │    模糊想法 → [product_design] → 用户故事（产品批准门）
 │              → [product_proposal_writing] → proposal（批准门一，产品侧） ── PR: docs → master
 └─ feat/AXY-<N>-<slug> 分支（开发侧）
      proposal → [dev_architecture_design] → design（批准门二）
              → [dev_plan_writing] → 实现计划
              → [dev_implementation] → TDD 实现（含集成 / E2E 测试）
              → （可选，由用户显式决定）[dev_spec_review] → 审查报告 ── PR: feat → master
```

两道批准门（proposal、design）未过，不得进入下一环节或写任何产品代码。

### 分支生命周期

流程与分支一一对应，两段式推进；**开分支与合并 PR 是流程动作，不是可选优化**。PR / squash merge / 分支清理等机械操作一律走 branch-wrapup 技能，细则在该技能 SKILL.md。

| 阶段 | 分支 | 承载内容 | 开启时机 | 收束时机 |
| --- | --- | --- | --- | --- |
| 产品设计 | `docs/<slug>` | docs/product 工件（story、proposal） | 创建或推翻用户故事时，从最新 `master` 开出（product_design / feature-supersede 产品侧开工时） | proposal 批准后，经 branch-wrapup PR 合并回 `master` |
| 开发落地 | `feat/AXY-<N>-<slug>` | docs/dev 工件（design / tasks / review）+ 产品代码 + 测试 | proposal 已合并进 `master`、进入 dev_architecture_design 时，从最新 `master` 开出 | 实现完工后（dev_spec_review 通过，或用户显式决定不审查），经 branch-wrapup PR 合并回 `master` |

补充规则：

- docs 分支以特性 slug 命名——取号在分支上进行，编号下发后**不重命名分支**；feat 分支编号即路径，编号已由 proposal 承载；
- 实现期回流 proposal 追认、批准后的措辞级修订等小幅产品文档改动，随当前工作分支走，不单独开分支；
- feature-supersede 横切两侧分支：阶段 1–4（定级、冻结、story / proposal 重写与重新批准）与 `change-record.md` 落盘、product 侧墓碑走 docs 分支并 PR；阶段 5 代码处置与阶段 6 重走下游客、dev 侧（design / tasks / review）墓碑走 feat 分支并 PR。

## 流程接力约定

流程技能通过「引用上游已批准文档」串联，每个技能 frontmatter 的 `description` 都声明了自己的输入前提，以此强制执行流程顺序；各技能 SKILL.md 另有「分支衔接」或「流程前后继」节自述上下游。

**分支衔接**：流程与分支一一对应——产品设计走 `docs/<slug>` 分支（product_design 开启、proposal 批准后经 branch-wrapup 收束），开发落地走 `feat/AXY-<N>-<slug>` 分支（dev_architecture_design 开启、实现完工——dev_spec_review 通过或用户显式决定不审查——后经 branch-wrapup 收束）；细则以上方「总流程与分支生命周期」为唯一真源。

**交接最小集**：下游技能默认只读下表「必读」列，不通读上游全文；需要细节时按各技能 SKILL.md 的条件句展开「按需」列——交接契约是子代理 prompt 自包含原则的原料，不是全文：

| 下游技能 | 上游产物 | 必读 | 按需展开 |
| --- | --- | --- | --- |
| `product_proposal_writing/` | 用户故事 | 全文（故事很短，五大组成部分）+「依赖」一层 | 更深的引用物 |
| `dev_architecture_design/` | proposal | 头部表、需求条目、边界与约束、性能与质量要求、原型契约 | 目标背景等叙述节 |
| `dev_plan_writing/` | design | design 的 contracts（契约）与需求承载对照（design.md）、testing（测试接缝）——计划信息唯一来源，不读 proposal | 数据模型细节、UI 小节 |
| `dev_implementation/` | tasks | tasks 全文（Global Constraints、不安排任务、Review Focus、任务卡、执行链、裁决记录节）——执行信息唯一来源，不读 design / proposal | 无（任务卡缺口回 dev_plan_writing 补卡） |
| `dev_spec_review/` | proposal + design + tasks | proposal 头部/需求条目/非目标/边界（Q 条目不在终审范围），design 需求承载对照与 contracts 契约总表，tasks Global Constraints 与裁决记录 | design 其余小节、任务卡细节 |

## 新增技能的规则

- 每个技能一个目录，内含 `SKILL.md`（frontmatter：`name` + `description`）与可选的 `templates/`、`references/`。
- 跨技能共享的规则文件放 `shared/`（如前端设计规范），各技能以 `../shared/<文件>` 引用；`shared/` 不是技能目录，不含 SKILL.md，技能区对仓库其他区域的文件级依赖收敛于此。
- `SKILL.md` 保持精简（约 150 行以内），只做路由、门禁与决策；内容超限时拆 `references/` 按需加载（渐进披露），不往 SKILL.md 里堆细节。
- `description` 必须写明触发条件与输入前提（引用哪个上游文档），防止相邻技能误触发。
- 编写风格以 [obra/superpowers](https://github.com/obra/superpowers) 为学习榜样：何时使用/不使用、硬门禁（HARD-GATE）、步骤可检查、合理化对照表（Common Rationalizations）。
- 涉及大量并行取证的技能应写明子代理委派指令，并遵守三原则：prompt 必须自包含、随到随验、主会话保留汇责与判定权；环境不支持子代理时内联执行并明说，不得假装已委派。
- 通用第三方技能优先当外部依赖安装（登记 skills-lock.json），不手抄进本目录。

# 技能目录（唯一真实来源）

本目录（`.agents/skills/`）是本项目 AI 技能的**唯一真实来源**。各 AI 工具目录一律通过 symlink 引用，不得复制副本：

```
.claude/skills → ../.agents/skills
.codex/skills  → ../.agents/skills
.dsh/skills    → ../.agents/skills
```

> **Windows 注意事项**：Git symlink 在 Windows 下需要系统开启「开发者模式」，并执行 `git config core.symlinks true`；否则 checkout 出来的 symlink 会退化为普通文本文件，技能加载会静默失效。

## 技能清单

目录为扁平结构，按研发流程三大部分（产品设计 / 开发落地 / 测试提质）组织流程技能；外部技能以依赖形式安装，由根目录 `skills-lock.json` 锁定版本。

### 流程技能（本地维护）

| 分组 | 技能 | 职责 | 输入 → 输出 |
| --- | --- | --- | --- |
| 产品设计 | `product-design/` | 将模糊想法转换为用户故事 | 模糊想法 → 用户故事（docs/product，五大组成部分） |
| 产品设计 | `proposal-writing/` | 用户故事 → 需求规范 | 已批准用户故事 → proposal（批准门一；docs/product/AXY-<N>-<slug>/，含原型契约） |
| 开发落地 | `architecture-design/` | 需求规范 → 架构设计 | 已批准 proposal → design（批准门二） |
| 开发落地 | `plan-writing/` | 架构设计 → 实现计划 | 已批准 design → tasks（微任务 + TDD） |
| 开发落地 | `spec-review/` | 实现完成后的规范终审 | proposal + 实现产物 → review 报告 |
| 测试提质 | （暂缺） | 测试提质阶段的质量加固 | 暂不编写 |

### 外部技能（skills-lock.json 管理）

| 技能 | 来源 | 用途 |
| --- | --- | --- |
| `better-auth-best-practices/` 等 6 个 | [better-auth/skills](https://github.com/better-auth/skills) | Better Auth 集成、安全、组织、2FA 等场景的最佳实践 |

外部技能不得手改（改动会与锁文件 hash 冲突）；升级或卸载走 skills-lock.json 对应的安装流程。

## 流程接力约定

流程技能通过「引用上游已批准文档」串联，每个技能 frontmatter 的 `description` 都声明了自己的输入前提，以此强制执行流程顺序。总流程图见 [docs/研发流程.md](../../docs/研发流程.md)（唯一一份，本文件不重复）。

**交接最小集**：下游技能默认只读下表「必读」列，不通读上游全文；需要细节时按各技能 SKILL.md 的条件句展开「按需」列——交接契约是子代理 prompt 自包含原则的原料，不是全文：

| 下游技能 | 上游产物 | 必读 | 按需展开 |
| --- | --- | --- | --- |
| `proposal-writing/` | 用户故事 | 全文（故事很短，五大组成部分）+「依赖」一层 | 更深的引用物 |
| `architecture-design/` | proposal | 头部表、需求条目、边界与约束、性能与质量要求、原型契约 | 目标背景等叙述节 |
| `plan-writing/` | design + proposal | design 契约与需求承载对照、proposal 需求条目与边界与约束 | 数据模型细节、UI 小节 |
| `spec-review/` | proposal + design + tasks | proposal 头部/需求条目/非目标/边界（Q 条目不在终审范围），design 需求承载对照与契约总表，tasks Global Constraints 与裁决记录 | design 其余小节、任务卡细节 |

## 新增技能的规则

- 每个技能一个目录，内含 `SKILL.md`（frontmatter：`name` + `description`）与可选的 `templates/`、`references/`。
- `SKILL.md` 保持精简（约 150 行以内），只做路由、门禁与决策；内容超限时拆 `references/` 按需加载（渐进披露），不往 SKILL.md 里堆细节。
- `description` 必须写明触发条件与输入前提（引用哪个上游文档），防止相邻技能误触发。
- 编写风格以 [obra/superpowers](https://github.com/obra/superpowers) 为学习榜样：何时使用/不使用、硬门禁（HARD-GATE）、步骤可检查、合理化对照表（Common Rationalizations）。
- 涉及大量并行取证的技能应写明子代理委派指令，并遵守三原则：prompt 必须自包含、随到随验、主会话保留汇责与判定权；环境不支持子代理时内联执行并明说，不得假装已委派。
- 通用第三方技能优先当外部依赖安装（登记 skills-lock.json），不手抄进本目录。

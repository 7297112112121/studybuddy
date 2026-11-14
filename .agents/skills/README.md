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
| 产品设计 | `product-design/` | 将模糊想法转换为产品设计 | 模糊想法 → 用户故事（docs/product） |
| 开发落地 | `proposal-writing/` | 用户故事 → 需求规范 | 已批准用户故事 → proposal（批准门一） |
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

流程技能通过「引用上游已批准文档」串联，每个技能 frontmatter 的 `description` 都声明了自己的输入前提，以此强制执行流程顺序：

```
模糊想法 → [product-design] → 用户故事
         → [proposal-writing] → proposal（批准门 1）
         → [architecture-design] → design（批准门 2）
         → [plan-writing] → 实现计划
         → TDD 实现（含集成 / E2E 测试）
         → [spec-review] → 审查报告
```

## 新增技能的规则

- 每个技能一个目录，内含 `SKILL.md`（frontmatter：`name` + `description`）与可选的 `templates/`、`references/`。
- `description` 必须写明触发条件与输入前提（引用哪个上游文档），防止相邻技能误触发。
- 编写风格以 [obra/superpowers](https://github.com/obra/superpowers) 为学习榜样：何时使用/不使用、硬门禁（HARD-GATE）、步骤可检查、合理化对照表（Common Rationalizations）。
- 通用第三方技能优先当外部依赖安装（登记 skills-lock.json），不手抄进本目录。

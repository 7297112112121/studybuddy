# 技能目录（唯一真实来源）

本目录是本项目 AI 技能的**唯一真实来源**，`.claude/skills` 是指向此处的 symlink。各 AI 工具目录一律通过 symlink 引用，不得复制副本。

## 技能分组

对应研发流程三大部分（产品设计 / 开发落地 / 测试提质）：

| 分组 | 目录 | 职责 | 输入 → 输出 |
| --- | --- | --- | --- |
| 产品技能 | `product/` | 将模糊想法转换为产品设计 | 模糊想法 → 用户故事（docs/product） |
| 开发技能 | `development/` | 把产品设计转化为实际产物 | 用户故事 → proposal → design → plan → 代码 → 审查报告 |
| 测试技能 | （暂缺） | 测试提质阶段的质量加固 | 暂不编写 |

## 流程接力约定

两组技能通过「引用上游已批准文档」串联，每个技能 frontmatter 的 `description` 都声明了自己的输入前提，以此强制执行流程顺序：

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

---
name: branch-wrapup
description: 当一条特性/修复分支的开发工作已完成、需要合并回 master 时使用(轻量工程操作技能,不在研发流程单向流内)。输入为当前工作分支;覆盖动作:推送并提交 PR、处理 PR 提交错误、squash merge、清理本地/远程分支、切回 master 拉新。分支尚有未完成的开发工作、或尚未通过 spec-review 等质量门禁时不应触发本技能。
---

# 轻量分支收尾(branch-wrapup)

## 定位

**轻量工程操作技能**:横切于 product-design → … → spec-review 流程之外,任意阶段可触发。只负责「工作分支 → 已合并 → 干净 master」这一段机械操作。质量门禁(TDD 铁律、spec-review、CI 绿灯)不归本技能,引用不复述——本技能假设分支内容已经完工,只管收尾。

**开始时声明**:「我正在使用 branch-wrapup 技能收尾分支 `<branch-name>`。」

## 硬门禁(HARD-GATE)

1. **工作区不干净不得提 PR**:未提交改动先按 Conventional Commits(中文描述)提交;要丢弃改动必须先经用户确认。
2. **合并方式固定为 squash merge**:保持 master「一 PR 一提交」的历史惯例(提交说明中文 + `(#<PR编号>)` 后缀)。
3. **未确认 PR 已合并不得删任何分支**:删除前必须以 `gh pr view` 确认 state 为 `MERGED`;squash 合并后本地分支对 git 而言「未合并」,删除须用 `-D`——此为预期行为,不是事故。
4. **禁止改写 master 历史**:禁止对 master force push / reset / rebase;特性分支自身 rebase 后仅允许 `git push --force-with-lease`。
5. **不盲目重试**:命令报错且不在「错误对照表」内时,原样把错误呈报用户,不得反复重试同一命令。

## 流程(五步)

### 1. 前置检查

- `git status --short` → 工作区干净(不干净走硬门禁 1)。
- 当前分支非 `master`(`git branch --show-current`)。
- `gh auth status` 可用;远程为 `origin`(基分支固定 `master`)。

### 2. 推送并提交 PR

```bash
git push -u origin <branch>
gh pr create --base master \
  --title "<Conventional Commits 中文标题>" \
  --body "<改动范围 + 测试情况 + 关联工件文档链接>"
```

PR 标题沿用分支提交的 Conventional Commits 格式;正文最少写清改动范围与测试情况。

### 3. 处理 PR 提交错误(对照表)

| 症状 | 处置 |
| --- | --- |
| `no upstream branch` / 提示先推送 | 回到第 2 步先 `git push -u origin <branch>` |
| `a pull request for branch X already exists` | 复用既有 PR:`gh pr view <branch> --web` 或带编号继续第 4 步,不新建 |
| CI 未通过 | `gh pr checks` 看失败项,修复后 push(新提交自动进同一 PR),再等绿灯 |
| 合并冲突 | `git fetch origin && git rebase origin/master`,解决后 `git push --force-with-lease` |
| 网络 / SSH 失败 | 本环境可能需代理(如 `HTTPS_PROXY=http://127.0.0.1:7897`)后重试一次 |
| 其余未知错误 | 原样呈报用户(硬门禁 5) |

### 4. Squash merge 与分支清理

```bash
gh pr checks --watch            # 等 CI 全绿
gh pr merge --squash \
  --subject "<PR标题> (#<PR编号>)" \
  --body "<PR正文或提交摘要>"
gh pr view --json state -q .state   # 必须输出 MERGED,才可继续
git push origin --delete <branch>   # 删远程分支
git branch -D <branch>              # 删本地分支(-D 是预期,见硬门禁 3)
git checkout master && git pull --ff-only
```

捷径:`gh pr merge --squash --delete-branch` 可一次完成合并 + 删远程/本地 + 切回默认分支;但任一环节失败时按上面手动步骤逐条兜底,并以 `gh pr view` 的 `MERGED` 为准。

### 5. 收尾验证与报告

- `git branch --list <branch>` 为空;`git status` 干净;当前在 `master`。
- `git log -1` 显示 squash 提交且带 `(#<N>)` 后缀。
- 输出收尾报告:PR 链接、squash commit 摘要、已删除的分支、master 新 HEAD。

## 常见合理化对照表

| 借口 | 裁决 |
| --- | --- |
| CI 还在跑,先把分支删了/切走了 | 不行——未确认 `MERGED` 不得删分支(硬门禁 3) |
| `git branch -d` 被拒,以为没合并成功,想改历史 | squash 合并后 `-d` 必拒绝,这是预期;先查 PR 状态再 `-D` |
| 改动很小,直接推 master 不开 PR | 除非用户明确要求,一律走 PR(仓库 GitHub Flow 惯例) |
| PR 正文先空着,合并后补 | 最少写清改动范围与测试情况;正文是审阅与回溯的唯一入口 |
| rebase 后被拒就用普通 force push | 只允许 `--force-with-lease`(硬门禁 4) |

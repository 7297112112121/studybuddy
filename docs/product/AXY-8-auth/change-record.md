---
title: 'Change Record: AXY-8 登录注册'
description: 登录注册的推翻/取代/废弃变更记录(CR-20261116-1)
sidebar_position: 5
---

# Change Record: AXY-8 登录注册

| 变更编号 | CR-20261116-1 | 日期 | 2026-11-16 |
| ---- | ---- | ---- | ---- |
| 关联特性 | AXY-8 登录注册 | 批准人 | 海渝 |

> 本记录由 feature-supersede 技能产出，是 story / proposal / design / tasks / review 之外的**第五份工件**：未来 spec-review 判断「哪些代码是活的」以本记录为准。**记录状态：未闭合**——第 5 节改造 commit 与第 8 节全量测试证据待代码处置执行后回填，闭合前不解除冻结。

## 1. 定级与判据

| 项 | 值 |
| - | - |
| 级别 | **B 级（AC 变化）** |
| 判据 | ①触及 R 条目：R1 / R2 / R4 / R8 / R9 / R10 / R14 重写，F-01 / F-03 / F-05 重写，E-04 废止，决策 D-06 / D-07 及 D-02 的验证码恢复计划显式废止；②触及数据模型与对外契约：user 表唯一索引列 phone_number → username（旧列删除），登录端点与插件形态（phoneNumber → 账户密码）整体改版；③下游：无已实现下游（查证见第 2 节） |
| 定级结论 | 特性定位不变（仍为登录注册 + 会话守卫，P0），仅凭据形态与协议勾选范围变化——B 级修订路径：story 按新语义修订重新批准、proposal 修订升版本、代码部分回滚改造、重走下游客 |

## 2. 下游影响

| 下游特性 | 依赖点 | 影响 | 处置 |
| - | - | - | - |
| 无 | 无——查证方式：docs/product/index.md 用户故事总览仅 AXY-8 一行（AXY-11 / AXY-12 已随 PR #26 删除、未实现）；全仓 grep `phone|手机号` 命中 17 个文件，全部落在 AXY-8 自身工件范围（modules/auth、lib/auth*、(app)/workbench 占位页、locales、api/auth 路由、db/migrations） | 不适用 | 不适用——无下游持有者可通知，提出者即批准人（会话内确认） |

## 3. story 变更

| 项 | 值 |
| - | - |
| 旧版 | 2026-11-15 版（五大组成部分模板，8 条 AC，手机号凭据），批准人海渝 |
| 新版 | 2026-11-16 版（7 条 AC，账户密码凭据，删 AC-8），批准人海渝 |
| 墓碑位置 | 不适用——B 级 story 修订后仍有效，按修订纪律更新（状态行注记修订依据 CR-20261116-1），不加墓碑 |

批准时序：CR-20261116-1 随冻结标记（story / proposal 头部标「需重审」）于 2026-11-16 签发，story 与 proposal 的批准动作发生在签发之后（同日，会话内时序）。

## 4. proposal 处置

| 项 | 值 |
| - | - |
| 处置 | **修订**（升版本 v3 → v4） |
| 编号策略 | 保留 AXY-8，升版本，批准人海渝（2026-11-16） |
| 语义是否变化 | **已变**（凭据形态手机号/邮箱 → 账户名+密码；协议勾选从登录+注册收窄为仅注册；数据模型唯一索引列变更；AC 集合 8 → 7 条） |
| 废止条目 | E-04（保留编号、R8 改引 E-02）；D-06 / D-07 及 D-02 的恢复计划显式废止（决策编号保留）。R 编号无整体废止：R1 / R2 / R4 / R8 / R9 / R10 / R14 原地重写 |

## 5. 代码处置

| 项 | 值 |
| - | - |
| 处置 | **部分回滚改造** |
| Git 引用 | 实现基线：PR #14 merge commit `baa88ea`（spec-review 基线 `4a7774c`，含修复批 `b6fdd6b`）。被替换逻辑（手机号/邮箱凭据、登录协议勾选）与保留基建（路由常量、会话守卫、i18n 设施、迁移底座）在同一批 feat 提交中交织（`8f48362`…`f73e1a5`），逐 commit revert 不可干净切分——处置为「删除被替换行为 + 按修订版 design TDD 重建」，改造 commit 于实现完成后回填本节 |
| 旧测试处理 | 被替换行为（手机号/邮箱凭据校验、手机号注册事务、登录协议勾选、手机号唯一索引并发、相关文案逐字断言）的单元 / 集成 / E2E 用例**删除**；保留部分（密码规则 R3、提交态 R5、落点分流 R6、统一失败文案 R7、会话守卫 R11 / R12、摘要 R13、协议落库 R15、视图切换 R16、显隐 R17）的测试继续生效，断言按 v4 更新 |
| 迁移处理 | **新增迁移**承载：删 user.phone_number / user.phone_number_verified 列与 user_phone_number 唯一索引，增 username 列与唯一索引（区分大小写）；**不改**旧迁移 `20261114052112_perpetual_songbird` |
| 删除期限与责任人 | 不适用 |

## 6. 墓碑清单

| 工件 | 路径 | 墓碑动作 | 完成 |
| - | - | - | - |
| story | docs/product/AXY-8-auth/story.md | 不加墓碑——B 级修订后仍有效，按修订纪律更新（状态行注记修订依据 CR-20261116-1） | 是 |
| proposal | docs/product/AXY-8-auth/proposal.md | 不加墓碑——修订升版 v4（frontmatter status: approved），Changelog 终条登记本次处置 | 是 |
| design | docs/dev/AXY-8-auth/design.md | 不加墓碑——已按 architecture-design 修订纪律重走（头部注记 CR-20261116-1 与实现基线，正文按 v4 重写为最终形态），2026-11-16 获批 | 是 |
| tasks | docs/dev/AXY-8-auth/tasks.md | 不加墓碑——待 plan 重走时按 plan-writing 修订纪律更新（既有裁决记录保持历史原貌，新增修订裁决节） | 否（随重走下游客） |
| review | docs/dev/AXY-8-auth/review.md | 头部加历史报告注记（判定结论不改，不得作为新 review 依据）+ 实现基线 Git 引用 `baa88ea` | 是 |

## 7. 重走下游客

| 阶段 | 状态 | 备注 |
| - | - | - |
| design | 已完成（2026-11-16 获批，批准人海渝） | 经 architecture-design 技能修订重走。**保留资产兼容性核对结论已落 design**（会话双写与守卫 R11/R12、协议落库 R15、密码摘要 R13、视图切换/显隐 R16/R17、路由常量、i18n 设施——逐项凭据无关，证据在 design 各对应节）；账号表结构随 design 定稿：user.username + user_username 唯一索引（区分大小写），新增迁移承载；开放问题 #4 声明空表迁移假设 |
| plan | 待重走 | 经 plan-writing 技能（design 获批后） |
| review | 待重走 | 经 spec-review 技能（实现完成后）；旧 review 已加墓碑，不参与新终审，新 review 只审新实现 |

## 8. 证据

| 项 | 内容 |
| - | - |
| Git 查证 | `git log --oneline baa88ea~1..baa88ea^2`：30 提交（`8f48362`…`f73e1a5`），phone 逻辑与保留基建交织，逐 commit revert 不可行（输出摘要见会话记录）；`git tag -l` 为空，B 级无处置 tag 约定 |
| 冻结记录 | 2026-11-16 story / proposal 头部标「需重审」（proposal frontmatter `status: needs-review`），冻结至重新批准；改造完成前代码维持冻结 |
| 重新批准记录 | story 第三稿（7 条 AC，批准人海渝，2026-11-16，CR 签发后）；proposal v4（批准人海渝，2026-11-16，CR 签发后） |
| 测试删除 / skip 记录 | 待实现阶段执行后回填（删除清单随改造 commit 登记） |
| 全量测试套件 | **待回填**——代码处置执行后 `npm test` + `npm run test:integration` + `npm run test:e2e` 全绿为本记录闭合条件；在此之前本记录保持未闭合，不解除冻结 |

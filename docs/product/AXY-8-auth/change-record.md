---
title: 'Change Record: AXY-8 登录注册'
description: 登录注册的推翻/取代/废弃变更记录(CR-20261116-1)
sidebar_position: 5
---

# Change Record: AXY-8 登录注册

| 变更编号 | CR-20261116-1 | 日期 | 2026-11-16 |
| ---- | ---- | ---- | ---- |
| 关联特性 | AXY-8 登录注册 | 批准人 | 海渝 |

> 本记录由 feature-supersede 技能产出，是 story / proposal / design / tasks / review 之外的**第五份工件**：未来 spec-review 判断「哪些代码是活的」以本记录为准。**记录状态：已闭合（2026-11-16）**——代码处置已执行（改造 commit 链见第 5 节），全量测试套件三绿（证据见第 8 节），冻结解除。

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
| Git 引用 | 实现基线：PR #14 merge commit `baa88ea`（spec-review 基线 `4a7774c`，含修复批 `b6fdd6b`）。被替换逻辑（手机号/邮箱凭据、登录协议勾选）与保留基建（路由常量、会话守卫、i18n 设施、迁移底座）在同一批 feat 提交中交织（`8f48362`…`f73e1a5`），逐 commit revert 不可干净切分——处置为「删除被替换行为 + 按修订版 design TDD 重建」。**改造 commit 链（2026-11-16，分支 feat/axy-8-username，每 commit 先红后绿）**：`b26c54d` validators 换装 → `6d32f15` i18n 13 键 → `dccddb7` schema+迁移 `20261116074441_crazy_molly_hayes`（删 phone 两列与索引、增 username 唯一索引；迁移前授权清库 dev 测试数据 181 行）→ `8119a43` username 插件换装 → `b0bb420` 注册事务 → `16897aa` actions/queries → `c5289d9` 端点集成 → `a1eca68` 表单组件（删 PhoneField）→ `f7732aa` AuthScreen 提交流程 → `31595c1` workbench 承接页 → `1a81ac3` E2E 换装；文档批：`59bc5b5`（CR 文档）、`f8eca08`（design/tasks 重走获批）、`cb0db43`（执行裁决入档） |
| 旧测试处理 | 被替换行为（手机号/邮箱凭据校验、手机号注册事务、登录协议勾选、手机号唯一索引并发、相关文案逐字断言）的单元 / 集成 / E2E 用例**删除**；保留部分（密码规则 R3、提交态 R5、落点分流 R6、统一失败文案 R7、会话守卫 R11 / R12、摘要 R13、协议落库 R15、视图切换 R16、显隐 R17）的测试继续生效，断言按 v4 更新 |
| 迁移处理 | **新增迁移**承载：删 user.phone_number / user.phone_number_verified 列与 user_phone_number 唯一索引，增 username 列与唯一索引（区分大小写）；**不改**旧迁移 `20261114052112_perpetual_songbird` |
| 删除期限与责任人 | 不适用 |

## 6. 墓碑清单

| 工件 | 路径 | 墓碑动作 | 完成 |
| - | - | - | - |
| story | docs/product/AXY-8-auth/story.md | 不加墓碑——B 级修订后仍有效，按修订纪律更新（状态行注记修订依据 CR-20261116-1） | 是 |
| proposal | docs/product/AXY-8-auth/proposal.md | 不加墓碑——修订升版 v4（frontmatter status: approved），Changelog 终条登记本次处置 | 是 |
| design | docs/dev/AXY-8-auth/design.md | 不加墓碑——已按 architecture-design 修订纪律重走（头部注记 CR-20261116-1 与实现基线，正文按 v4 重写为最终形态），2026-11-16 获批 | 是 |
| tasks | docs/dev/AXY-8-auth/tasks.md | 不加墓碑——已按 plan-writing 修订纪律重走（12 任务改造序列，旧版 43 条裁决历史原貌保留，修订执行期裁决追加尾部），T1–T12 全部执行完毕（2026-11-16） | 是 |
| review | docs/dev/AXY-8-auth/review.md | 头部加历史报告注记（判定结论不改，不得作为新 review 依据）+ 实现基线 Git 引用 `baa88ea` | 是 |

## 7. 重走下游客

| 阶段 | 状态 | 备注 |
| - | - | - |
| design | 已完成（2026-11-16 获批，批准人海渝） | 经 architecture-design 技能修订重走。**保留资产兼容性核对结论已落 design**（会话双写与守卫 R11/R12、协议落库 R15、密码摘要 R13、视图切换/显隐 R16/R17、路由常量、i18n 设施——逐项凭据无关，证据在 design 各对应节）；账号表结构随 design 定稿：user.username + user_username 唯一索引（区分大小写），新增迁移承载；开放问题 #4 声明空表迁移假设 |
| plan | 已完成（2026-11-16，12 任务 T1–T12 全部收口） | 经 plan-writing 技能修订重走；执行方式为子代理逐任务（每卡自包含 prompt），执行期裁决 20 余条入 tasks.md 裁决记录节 |
| review | 已完成（2026-11-16，判定**通过**） | 经 spec-review 技能重走：四层核对（R1–R17 全过、F/E/路由行为/D-xx 逐字逐项、design 补强行为、非目标 9 条零越界）+ 契约一致 + CR 期 20 条裁决全落实；1 项 Important（validation.test 桩键残留 phoneNumber）于终审修复批闭合并复验（110/110）；注入验证 4 处（三层 + 高风险条目）与 R13 人工抽检证据见 review.md 证据附录；旧手机号版报告全文保留于 review.md 历史附录 |

## 8. 证据

| 项 | 内容 |
| - | - |
| Git 查证 | `git log --oneline baa88ea~1..baa88ea^2`：30 提交（`8f48362`…`f73e1a5`），phone 逻辑与保留基建交织，逐 commit revert 不可行（输出摘要见会话记录）；`git tag -l` 为空，B 级无处置 tag 约定 |
| 冻结记录 | 2026-11-16 story / proposal 头部标「需重审」（proposal frontmatter `status: needs-review`），冻结至重新批准；改造完成前代码维持冻结 |
| 重新批准记录 | story 第三稿（7 条 AC，批准人海渝，2026-11-16，CR 签发后）；proposal v4（批准人海渝，2026-11-16，CR 签发后） |
| 测试删除 / skip 记录 | **已执行（2026-11-16，全删除零 skip）**。删除清单（文件→用例）：tests/auth/validators.test.ts 13 例（PHONE_RE 5、EMAIL_RE 3、手机号/邮箱格式与 kind 分类 5）；tests/auth/schema.test.ts 3 例（phone 10 位拒绝、phoneNumber notNull、user_phone_number 索引）；tests/integration/auth/service.test.ts 手机号 3 例（注册/同号/并发同号）；tests/integration/auth/actions.test.ts phone 3 例；tests/integration/auth/endpoints.test.ts 旧 4 例（/sign-in/phone-number 三情形 + phone 版 403 二路径）；tests/auth/components/validation.test.tsx 3 例（旧格式文案 2 + 登录侧协议 aria-invalid 1）；tests/auth/components/submission.test.tsx B2 邮箱短路 1 例；e2e/auth.spec.ts R4 登录侧整例（新写注册侧 R4 替代，例数 13 不变）。组件：PhoneField.tsx 整文件删除（全仓 grep 零残留）。helpers：uniquePhone/uniquePhoneSeq 删除（T7 后全仓零引用）。i18n：删 2 键（register.phoneInvalid、error.phoneRegistered） |
| 全量测试套件 | **已闭合（2026-11-16）**：`npm test` 16 文件 110/110 全过；`npm run test:integration` 5 文件 17/17 全过（真实 PG/Redis）；`npm run test:e2e` 14 用例全过（42.5s，含生产构建，限流敏感区两轮稳定复验）；`npm run type-check` + `npm run lint` + `npm run lint:circular` 干净退出；`npm run docs:build` SUCCESS |

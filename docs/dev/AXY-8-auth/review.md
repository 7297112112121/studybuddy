---
title: 'Review: AXY-8 登录注册'
description: 规范终审报告——R1-R19 逐条核对、代码质量审查、豁免待验清单与证据附录
sidebar_position: 4
---

# Review: AXY-8 登录注册

| 对应规范 | [proposal.mdx](./proposal.mdx) | 审查日期 | 2026-11-14 |
| ---- | ---- | ---- | ---- |
| 审查基线 | feat/axy-8-auth，HEAD `4a7774c`（含终审修复批 `b6fdd6b` + `4a7774c`） | 判定 | **通过** |

## 判定

**通过。** R1–R19 全部有实现落点与当次通过的测试证据（豁免清单仅 Q1/Q2，登记完整）；非目标 9 项零越界；契约与 design 的偏离全部有裁决记录且已回写；发现清单无 Critical，2 项 Important 均已闭合或如实披露为流程记录缺口，Minor 为测试覆盖建议与跨浏览器遗留。

审查方式：全部验证命令由主会话当次运行取新鲜证据（证据附录）；R 条目落点核对、非目标越界检查、契约与裁决核验由只读审查子代理执行，其四处关键论断（FormSummary 计数语义、redis 死导出、route 导出面、auth.ts 陈旧注释）经主会话直接读码复核证实。

## 逐条核对表

| # | 结论 | 实现落点 | 测试证据（断言含 proposal 精确值） |
| - | ---- | ---- | ---- |
| R1 | 通过 | [validators.ts](../../../src/modules/auth/validators.ts)、[AuthScreen.tsx](../../../src/modules/auth/components/AuthScreen.tsx)、[FormSummary.tsx](../../../src/modules/auth/components/FormSummary.tsx) | 单测 `validation.test.tsx`（留空文案「请输入手机号或邮箱」+ 汇总计数 + 不提交）；E2E R1 用例逐字断言双空「有 2 项需要修改」+ aria-invalid + URL 不变。汇总计数的「项」为字段项、协议错误依 R4 单独呈现——提出者裁决 2026-11-14，proposal 措辞已同步 |
| R2 | 通过 | validators.ts（PHONE_RE/EMAIL_RE/validateAccount） | 单测全分支（10 位、首位 2、号段外、含空格、abc@mail）；组件测试「格式不对：手机号 11 位，或 name@mail.com」逐字 + 改填消失；E2E R2 同文案 |
| R3 | 通过 | validators.ts（PASSWORD_RE/validatePassword），三处输入框共用 | 单测接受 abcd1234/a1234567、拒绝 12345678/abcdefgh/1234567/21 位；组件测试逐字「密码为 8—20 位，需含字母与数字」；E2E R3 纯数字反例 |
| R4 | 通过 | AgreementCheckbox.tsx（aria-invalid）、AuthScreen（未勾选不提交） | 组件测试 aria-invalid + 不提交；E2E R4 逐字「请阅读并勾选《用户协议》与《隐私政策》」+ 勾选后解除 |
| R5 | 通过 | SubmitButton.tsx（disabled + 文案）、AuthScreen（防重入） | 组件测试「登录中…」「注册中…」两文案逐字 + disabled；E2E 拦截 sign-in 延迟断言「登录中…」+ disabled + 放行落 /workbench。「注册中…」的 E2E 半边由单测补位（见发现 M-2） |
| R6 | 通过 | AuthScreen（成功 `router.replace(ROUTES.workbench)`，无档案分流） | E2E 两个独立账号（注册→退出→登录）均落 /workbench 且 session-phone 一致；验证方式已随 PO 修订同步（非目标 #9 废除建档概念） |
| R7 | 通过 | errors.ts（mapSignInError）、auth.ts（邮箱端点 403 hook） | 集成 `endpoints.test.ts` 三情形（未注册号/错密码/空密码直连）断言状态码/代码/文案三者各自集合长度为 1，且全文不匹配探测性词汇；E2E 邮箱形态→「账号或密码不对」 |
| R8 | 通过 | RegisterForm.tsx（四字段、无验证码）、validators.ts（validateRegisterForm） | 单测/组件/E2E 三层；E2E R8 逐字「请输入 11 位有效手机号」「两次输入的密码不一致」+ 汇总计数 + URL 不变 |
| R9 | 通过 | service.ts（单事务插 user+account）、actions.ts、AuthScreen（注册即登录） | 集成 `service.test.ts`/`actions.test.ts` 断言 user 行与 account 摘要；E2E registerViaUI 断言 /workbench + session-phone |
| R10 | 通过 | service.ts（23505→PHONE_ALREADY_REGISTERED）、AuthScreen（整条文案可点切视图） | 集成同号再注册 user 恰 1 行；E2E 逐字「该手机号已注册，去登录」+ 点击后 /login + 账号框带入手机号 |
| R11 | 通过 | SignOutButton.tsx、auth.ts（DB+Redis 双写会话） | 集成 sign-out 后旧 cookie 无 user、Redis 键删除、PG session 行删除；E2E 退出→直访/后退均回 /login、重登数据完好 |
| R12 | 通过 | (auth)/layout.tsx（已登录渲染 AuthRedirect）、AuthRedirect.tsx（阈值 `>2`） | 单测 length=3→back、2/1→replace；E2E 有历史落 /workbench、新页面直开落 /workbench |
| R13 | 通过 | service.ts（hashPassword）；src 全链路无日志输出点 | 查库 3 条：account.password 为 161 位摘要非明文；查日志：E2E 全量运行日志 grep 明文密码 0 处（证据附录）；集成断言摘要格式 + verifyPassword |
| R14 | 通过 | schema.ts:44（uniqueIndex）、migration.sql | 集成并发同号两次恰一成功一 PHONE_ALREADY_REGISTERED、user 恰 1 行；查库直证 `user_phone_number` 唯一索引存在（pg_indexes） |
| R15 | 通过 | schema.ts（agreementVersion/agreedAt notNull）、service.ts（'v1' + new Date()） | 集成断言两字段；查库 3 条 agreement_version='v1' + agreed_at 时间戳 |
| R16 | 通过 | AuthScreen（switchView 保值清错 + replaceState）、AuthTabs/ViewSwitchLink | 单测值保留 + replaceState + 错误清空；E2E R16 URL/值保留/错误 hidden/切回值仍在 |
| R17 | 通过 | PasswordField.tsx（visible 局部态、type 切换） | 组件测试登录框与注册两框独立切换；E2E 登录框与设置密码框 type 切换 + 值保留（确认密码框切换由单测补位，见发现 M-2） |
| R18 | 通过 | OAuthPlaceholder.tsx（两按钮 disabled + 占位文案） | 组件测试 disabled + 「本期不做，仅占位」；E2E 两按钮 toBeDisabled + 文案可见 |
| R19 | 通过 | ForgotPasswordLink.tsx（preventDefault + 提示） | 组件测试「找回密码功能暂未开通」+ 无导航；E2E 文案可见 + URL 不变 |
| Q1 | 豁免 | — | 豁免登记完整（理由/去向/日期俱全），列豁免待验清单 |
| Q2 | 豁免 | — | 同上 |

## 非目标越界检查（9 项零越界）

| # | 非目标 | 结论 | 关键证据 |
| - | ---- | ---- | ---- |
| 1 | 短信验证码发送与校验 | 未做 | `sendOTP` 为 no-op；注册表单无验证码字段 |
| 2 | 找回密码 | 未做 | 仅占位提示；无 resetPassword/forgetPassword 端点 |
| 3 | 第三方登录真实逻辑 | 未做 | 无 socialProviders；占位按钮 disabled 且无 onClick |
| 4 | 邮箱注册 | 未做 | `/sign-up/email`、`/sign-in/email` 被 before-hook 403（集成测试直连断言 403） |
| 5 | 协议正文与法务 | 未做 | 链接 `#` + preventDefault；仅落库版本与时间 |
| 6 | 2FA/魔术链接/组织插件 | 未启用 | plugins 仅 phoneNumber |
| 7 | 记住我/多端会话管理 | 未做 | signIn 调用不带 rememberMe |
| 8 | 企业/高校账号对接 | 未做 | 无相关代码与文案 |
| 9 | 强制分流信息录入 | 未做 | 成功链路一律 `router.replace(ROUTES.workbench)`；不查档案表；无信息录入路由 |

## 契约与裁决核验

- design 契约表与实际签名**逐项一致**（validators/service/queries/actions/errors/routes/auth-client/组件 props/布局守卫）。
- 全部契约偏离均有裁决记录：hooks.before 单中间件、trustedOrigins 兜底、drizzleAdapter 显式 schema、`validateSchema: false`、AuthRedirect 阈值 `>2`、drizzle client 形态——且 design.mdx 已补「实现裁决注记」回写（`4a7774c`）。
- tasks.md 裁决记录 43 条（含 spec-review 批次 5 条）逐条核到代码，无「记了裁决代码没有」或反向漏记。
- design 开放问题 #1/#2 的实测闭合结论已回写，与实现注释互相印证。

## 发现清单

**Critical：无。**

**Important（2 项，均已处置）**

1. **TDD 先红后绿的过程轨迹未留持久记录**：tasks.md 76 个步骤勾选框全部未勾选（0/76），「确认以预期方式失败」无法从计划文档自身确认。处置：过程不可补录，如实披露；终审以结果证据（当次三套件全绿 + 断言逐字锁定 proposal 精确值）+ 库内轨迹旁证（Task 12 E2E 首跑 10 败后修复、Task 5/6 集成调试失败记录均入裁决）替代。代价：个别测试若实为「实现后补写」，其边界覆盖力度存疑——由发现 2 的补测建议部分对冲。流程改进：后续迭代执行时须勾选步骤框。
2. **R1 汇总计数语义与 proposal 字面张力**：协议勾选错误不进顶部汇总（Task 9 裁决），与 R1 原文「按实际未通过项数计数」字面冲突。处置：提出者裁决 2026-11-14（接受现行为），proposal R1 措辞已修订、裁决已入 tasks.md——闭合。

**Minor（4 项，遗留不阻断）**

1. **E2E 覆盖两处半缺、单测补位**：R5「注册中…」加载态仅单测断言（E2E 只拦 sign-in 验「登录中…」）；R17 确认密码框显隐切换 E2E 未点（单测覆盖）。建议测试提质阶段补 E2E 用例。
2. **E2E R12「无历史」用例形态**：实现用同 context `context.newPage()` 而非计划文字「新建 context」——行为等价（历史槽位起算一致），与计划文字不符已由行为等价性覆盖。
3. **跨浏览器遗留**：AuthRedirect 阈值 `>2` 的语义依赖 Chromium 的 about:blank 历史槽位行为（Task 12 裁决自认），Firefox/WebKit 未验证；playwright 仅 chromium 一个 project。
4. **API route 导出面超 design 示意**：全量导出五方法（design 示意 GET/POST）——已补裁决记档（`toNextJsHandler` 返回集合即全量透传），未来 Better Auth 版本变化需复核。

**终审修复批已闭合项**（提交 `b6fdd6b` + `4a7774c`）：限流语义陈旧注释两处纠偏、redis 死导出内部化、design 裁决注记回写、proposal R6 验证方式同步、R13 查日志证据补齐（见证据附录）。

## 豁免待验清单（移交测试提质）

| # | 要求原文 | 豁免理由 | 去向 |
| - | ---- | ---- | ---- |
| 1 | Q1：登录/注册接口 p95 响应时间 ≤ 500ms（开发环境，每接口 ≥ 100 次采样） | AC 无性能条目，压测环境与采样脚本未建立（提出者确认 2026-11-14） | 测试提质 |
| 2 | Q2：`/login` 页面首屏可交互 ≤ 2s（开发环境） | 同上 | 测试提质 |

## 证据附录（全部为 2026-11-14 当次运行）

| 时间 | 命令 | 结果 |
| ---- | ---- | ---- |
| 15:41 | `npm test` | 16 文件 / 115 用例全过 |
| 15:41 | `npm run test:integration` | 4 文件 / 12 用例全过（真实 PG/Redis） |
| 15:41 | `npm run type-check` + `npm run lint` + `npm run lint:circular` | 全部干净退出，无循环依赖 |
| 15:42、15:47 | `npm run test:e2e`（两次） | 16 用例全过（43.3s / 42.5s，含生产构建） |
| 15:52 | `docker exec studybuddy-postgres psql ...`（三查询） | R13：3 条 credential 账号密码均为 161 位摘要；R15：3 条 agreement_version='v1' + agreed_at；R14：pg_indexes 直证 `user_phone_number` UNIQUE INDEX 存在 |
| 15:47 | E2E 全量日志 `grep -c "e2ePass123"` | **0 处**（R13 查日志：该次运行含多次注册与登录，日志无明文密码） |
| 16:03 | 修复批后复跑 `npm test` / `npm run test:integration` | 115 / 115、12 / 12 全过 |
| 16:04 | 修复批后复跑 `npm run test:e2e` + type-check + lint | 16 / 16 全过（42.1s）、干净退出 |
| 16:02 | `npm run docs:build`（修复批） | SUCCESS（直接运行未接管道，无退出码掩盖） |

审查过程产物：只读核对子代理报告（R 表/非目标/边界/契约/裁决全量核对）→ 主会话抽查复核 4 处 + 补运行验证 6 项；确定性修复批子代理（`b6fdd6b` + `4a7774c`）；R1 语义经提出者裁决后由主会话落 proposal 修订与裁决入档。

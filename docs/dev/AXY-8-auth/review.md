---
title: 'Review: AXY-8 登录注册'
description: 规范终审报告——账户名凭据版(CR-20261116-1 后新实现)的判定/核对表/发现清单/移交清单/证据附录
sidebar_position: 4
---

# Review: AXY-8 登录注册

| 对应 Proposal | [proposal.md](../../product/AXY-8-auth/proposal.md)（v4，CR-20261116-1 修订重批） | 判定 | **通过** |
| ---- | ---- | ---- | ---- |
| 审查日期 | 2026-11-16 | 审查人 | AI 终审代理（spec-review 技能；提出者海渝） |
| 审查基线 | 分支 feat/axy-8-username：改造 commit 链 `b26c54d`…`c4a086c` + 终审修复批（本提交） | 变更管理 | [change-record](../../product/AXY-8-auth/change-record.md)（CR-20261116-1） |

> 本报告为 CR-20261116-1 后**新实现（账户名+密码凭据）的终审**，以 proposal v4 + 修订版 design 为核对源。旧手机号凭据版报告按墓碑纪律全文保留于文末「历史报告」附录，判定结论保持历史原貌、不作为新终审依据（原文亦存 git `c4a086c`）。

## 判定

**通过。** 四层核对全部通过：R1–R17 逐条有实现落点与当次通过的测试，验收断言逐项覆盖（缺口项均核对为「他层有载体」的层级归属漂移，记 Minor）；F / E / 路由行为 / D-xx 规范细节逐字逐项一致；design 补强行为（插件六配置项、403 三路径、占位邮箱、immutable、会话双写、状态转换、开放问题假设）逐项落实；非目标 9 条零越界。契约总表 8 行签名逐字一致，仅 2 处偏离均有裁决记录且 design 侧留有指针。CR 期 20 条裁决逐条核到代码，无「记了裁决代码没有」。

代码质量无 Critical。**1 项 Important（validation.test.tsx 桩键残留 phoneNumber，致「不提交」断言恒真空转、合法值改填用例经异常分支仍绿）已在终审修复批闭合**：桩键换 `username`、默认 resolve `{ data, error }` 形态、补正向对照断言、头注更新；修复后单测 110/110 复验全绿。其余发现均为 Minor（不阻塞，多数建议移交测试提质）。

审查方式：全部验证命令由主会话当次运行取新鲜证据（证据附录）；四层取证由 4 个只读审查子代理分片执行，其关键论断（桩键残留、双约束映射、迁移 SQL、AuthScreen 异常归一路径）经主会话直接读码复核证实；先红后绿按「注入验证」取证 4 处（三层各至少一条 + 高风险条目），另以 tasks 裁决记录的中间红归属图作全量旁证。

## 逐条核对表（R 条目层）

| 条目 | 核对内容（落点 + 测试 + 断言覆盖，明细见测试质量核对表） | 结果 | 证据 |
| ---- | ---- | ---- | ---- |
| R1 | validators.ts `validateAccount` 留空分支 → AccountField 字段下方 E-01 + FormSummary 计数 + 表单不提交（AuthScreen.tsx:193-209 校验不过即 return） | ✅ | validation.test.tsx:66-77（修复后断言真实）；e2e/auth.spec.ts:43-63（双错误逐字 + 汇总 2 + URL 停 /login） |
| R2 | `USERNAME_RE` 单一规则；改填合法后消失（受控状态）；输入无过滤（D-12） | ✅ | validators.test.ts:14-33；validation.test.tsx:89-118（含输入完整保留 + 修复后正向对照）；e2e:65-98；注入验证（USERNAME_RE 破坏 → 红） |
| R3 | `PASSWORD_RE` 三处共用（单源 + 同组件复用） | ✅ | validators.test.ts:36-56；validation.test.tsx:120-134；e2e:100-108（纯数字形态；21 位/通过例在单元+组件层，M-4） |
| R4 | AgreementCheckbox 仅挂 RegisterForm；注册未勾选不提交 + aria-invalid；登录表单无协议行（D-13） | ✅ | validation.test.tsx:188-207（错误态）+ 136-141（登录无协议行显式断言）；e2e:173-200（注册侧整链；E2E 无登录侧显式断言，M-2） |
| R5 | AuthScreen.submitting → SubmitButton 文案与禁用 | ✅ | submission.test.tsx:128-160（两文案逐字 + disabled）；e2e:241-251（拦截 sign-in/username 延迟断言「登录中…」）；pending 期间二次点击无断言，M-1 |
| R6 | 登录成功 `router.replace(ROUTES.workbench)`，链路无档案查询（D-03） | ✅ | submission.test.tsx:257-276（payload 含 username、无档案查询）；e2e:278-303（两独立账号全链路，session-account 一致） |
| R7 | `/sign-in/username` 三情形（未注册/错密码/空密码直连）同状态码/code/message | ✅ | endpoints.test.ts:65-98（三集合长度=1 + 无探测性字样加强断言）；submission.test.tsx:189-218（客户端 401/429）；E-06 无 E2E 载体为已披露裁决（M-7） |
| R8 | RegisterForm 字段集（账户名/密码/确认密码/协议，无验证码）+ E-02/E-05 | ✅ | validation.test.tsx:145-186；e2e:131-171（逐项 + URL 不变）；无验证码字段为结构缺位 + 非目标 #1 grep（M-5） |
| R9 | registerAction 成功 → signIn.username 自动登录 → workbench；user 行落账户名 | ✅ | service.test.ts:41-67；actions.test.ts:26-51；submission.test.tsx:98-124；e2e:231-276 |
| R10 | 23505 双约束映射 → USERNAME_ALREADY_REGISTERED → 文案可点切登录带入账户名；同名恰 1 行 | ✅ | service.test.ts:70-84；submission.test.tsx:164-187；e2e:263-273；注入验证（单约束收窄 → R10 红） |
| R11 | signOut 删 Redis 键 + PG 行 + 旧 cookie 失效；退出回 /login | ✅ | endpoints.test.ts:177-217（三处失效）；route-guards.test.tsx:126-161；e2e:306-335 |
| R12 | (auth) 布局守卫不渲染表单；AuthRedirect 有历史 back / 无历史 replace | ✅ | route-guards.test.tsx:84-103；auth-redirect.test.tsx:45-72（阈值 3/2/1 三分支）；e2e:331-349；「响应不含表单」E2E 无载体（M-3） |
| R13 | 密码只存摘要；接口与日志无明文 | ✅ | 人工抽检（当次）：查库 3 条均 161 位 `盐:哈希` 摘要、`LIKE '%e2ePass123%'` 0 行；E2E 全量运行日志 grep 明文 0 处；src/ 零日志调用点；service.test.ts:63-67 摘要断言（自动化补测归 C-05） |
| R14 | `user_username` 唯一索引（区分大小写）+ 并发恰一成功 | ✅ | service.test.ts:86-145（并发同名 + 大小写变体两账号共存）；migration.test.ts:23-50（pg_indexes 直证）；注入验证（单约束收窄 → R14 红）；查库直证大小写两行共存 |
| R15 | 注册事务写入 agreement_version='v1' 与 agreed_at | ✅ | service.test.ts:41-52；人工抽检查库 3 条均 v1 + agreed_at 非空 |
| R16 | switchView 保值清错 + replaceState 同步 URL | ✅ | view-switch.test.tsx:43-91；e2e:202-229 |
| R17 | PasswordField 显隐切换（三处独立局部态） | ✅ | validation.test.tsx:210-234（登录框 + 注册两框独立）；e2e:110-129 |

Q1 / Q2 不进本表（D-09），见性能与质量移交清单。

## 规范细节核对表

| 编号 | 要求（逐字/逐项） | 实现落点 | 一致性证据 |
| ---- | ---- | ---- | ---- |
| F-01/F-03 | `^[一-龥A-Za-z0-9_]{1,16}$`，区分大小写，无过滤提交时校验 | validators.ts:6、schema.ts:100、lib/auth.ts:24（内联副本，auth.test.ts:24-32 源码同步守护） | 逐字一致；AccountField 无 maxLength、onChange 原样透传（AccountField.tsx:25-28） |
| F-02 | `^(?=.*[A-Za-z])(?=.*\d).{8,20}$` 三处一致 | validators.ts:8（单源）+ schema.ts:101 + lib/auth.ts:48-52（8/20） | 逐字一致；三处共用 validatePassword 与 PasswordField |
| F-04 | 确认密码一致 | validators.ts:61-66（为空或不一致 → passwordMismatch） | 一致（validation.test.tsx:159-186 两形态） |
| F-05 | 协议必勾（仅注册），z.literal(true) | validators.ts:68-70 + schema.ts:103 | 一致 |
| E-01 | 「请输入账户名」字段下方 + 汇总 | auth.json:3；AccountField.tsx:35-39 | 逐字（validation.test.tsx:74、e2e:50-52） |
| E-02 | 「格式不对：1—16 位中文、字母、数字或下划线」字段下方、改填消失 | auth.json:4 | 逐字（三层断言；E2E 注入验证改文案 → 红） |
| E-03 | 「密码为 8—20 位，需含字母与数字」字段下方 | auth.json:8；PasswordField.tsx:67-71 | 逐字 |
| E-04 | 已废止，无产出点 | — | grep 全仓无该文案（R8 改引 E-02 落实） |
| E-05 | 「两次输入的密码不一致」字段下方 | auth.json:11；RegisterForm 确认密码框 | 逐字 |
| E-06 | 「账号或密码不对」表单提示区；无差异文案 | auth.json:17；AuthScreen.tsx:263-282 topError | 逐字；mapSignInError 按 status 归一（errors.ts:19-32） |
| E-07 | 「该账户已注册，去登录」注册提示区、整条可点 | auth.json:19；AuthScreen.tsx:270-277 | 逐字（submission.test.tsx:164-187、e2e:263-273） |
| 路由行为 #1 | 未登录服务端拦截，响应不含受保护内容 | (app)/layout.tsx:18-24 + workbench/page.tsx:19-22 双检 | route-guards.test.tsx:107-113；e2e:351-374（B6 响应原文四项 not.toContain + 浏览器级落 /login） |
| 路由行为 #2 | 登录成功落承接页，不分流 | AuthScreen.tsx:137 | e2e R6 两账号；submission.test.tsx:257-276 |
| 路由行为 #3 | 注册自动登录落承接页 | AuthScreen.tsx:158-186 | submission.test.tsx:98-124；e2e:231 |
| 路由行为 #4 | 退出回 /login，会话即刻失效（Redis+PG） | SignOutButton.tsx:18-26（finally 强制 replace） | endpoints.test.ts:177-217；e2e:306 |
| 路由行为 #5 | 已登录不渲染表单；有历史 back / 无历史 replace | (auth)/layout.tsx:16-22 + AuthRedirect.tsx:22-29（阈值 `>2`） | route-guards + auth-redirect.test；e2e:331-349 双分支 |
| 路由行为 #6 | 切换保值清错 + URL 同步 | AuthScreen.tsx:116-125（replaceState） | view-switch.test.tsx:43-91；e2e:202-229 |
| 路由行为 #7 | E-07 点「去登录」切视图并带入账户名 | AuthScreen.tsx:270-277 | submission.test.tsx:184；e2e:273 |
| D-01 | 协议错误不进汇总计数 | FormSummary 计数不含 agreement（AuthScreen 下发剔除） | e2e:189（formSummary hidden）+ validation.test 汇总计数 |
| D-02/D-06/D-07 | 已废止（验证码恢复计划 / 手机号 / 邮箱凭据） | 无验证码字段、无 sendOTP、邮箱形态走 E-02 无特例 | 非目标 #1/#4 核对；submission.test.tsx:222-234（邮箱用例直证无特例） |
| D-03/D-04/D-05 | 不分流 / 自动登录 / 建档分离 | 全链路 replace(workbench)，无档案查询、无录入路由 | e2e R6×2 + R9；grep `档案|录入|onboard` 零命中 |
| D-08 | 占位入口已删（无链接、无第三方按钮） | AgreementCheckbox.tsx:31 纯文本 | grep `href` 于 auth 组件零命中，无锚点标签 |
| D-09 | Q 后置测试提质 | 本报告移交清单 | 一致 |
| D-10 | 承接页最小验收 | /workbench 路由存在、B6 守卫、登录可达 | e2e B6 + R6/R9/R12 |
| D-11/D-12/D-13 | 开放问题重开闭合 / 无过滤 / 协议仅注册 | 见上 F-01、F-05 行与 R4 行 | 一致 |

## 契约一致性核对表

| 契约 | design 签名 | 实现签名 | 错误情形一致 | 结果 |
| ---- | ---- | ---- | ---- | ---- |
| registerAction | `registerAction(input: RegisterInput): Promise<RegisterActionResult>`（三分支判别联合） | actions.ts:69-88 逐字一致 | 一致（INVALID_INPUT + fieldErrors / USERNAME_ALREADY_REGISTERED） | ✅ |
| registerWithUsername | `{ username, password } → Promise<RegisterOutcome>` | service.ts:66-89 一致 | **偏离已裁决**：23505 双约束映射（user_username ∨ user_email_key），tasks.md:383 + design.md:270-271 指针注记；注入验证证实单约束必红 | ✅ |
| hashPassword | better-auth/crypto scrypt | service.ts:10/86 一致 | 一致 | ✅ |
| authClient.signIn.username | `{ username, password }`，错误经 mapSignInError | AuthScreen.tsx:129-134 一致（不传 rememberMe，合非目标 #7） | 一致（429 → tooManyAttempts） | ✅ |
| authClient.signOut | 失败仍强制 replace | SignOutButton.tsx:18-26（finally） | 一致 | ✅ |
| getCurrentSession | `→ Promise<AuthSession \| null>` | queries.ts:21-44 一致（含 `username ?? ''` 与 `new Date()` 归一，任务卡明示形态，M-9） | 一致（未登录 → null） | ✅ |
| validateAccount / validatePassword / validateRegisterForm | 纯函数、messageKey 联合 | validators.ts:6-73 逐字一致 | 一致（返回 messageKey 不抛） | ✅ |
| auth.handler | GET/POST 示意 | route.ts:16 全量导出五方法 | **偏离已裁决**（tasks.md:367，`toNextJsHandler` 返回集合全量透传，文件头注释说明） | ✅ |

lib/auth.ts 契约块逐项一致（六配置项、403 三路径、session 双写、validateSchema:false、trustedOrigins `??` 兜底）；hooks.before 单 AuthMiddleware 形态偏离有原版裁决（tasks.md:337）且 design 留注记。

## 测试质量核对表

红绿确认方式说明：**注入验证** = 本次终审临时破坏实现/断言跑红再恢复（共 4 处，覆盖单测/集成/E2E 三层与全部高风险条目）；**附带失败输出** = tasks.md 裁决记录的中间红归属图与预期失败形态（T1–T11 各卡先红后绿，T5 单约束 2 红、T7 端点连接层红、T11 E2E 首跑失败清单均有记档）；两者覆盖之外标「层级抽样旁证」。

| R | 验收断言（逐项） | 测试名 | 断言覆盖 | 红绿确认 | 结果 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| R1 | E-01 字段下方 | validation「账号留空…」+ e2e R1 | 覆盖 | 附带失败输出（T8/T11） | ✅ |
| R1 | 顶部汇总可见 | 同上（「有 1 项需要修改」） | 覆盖 | 同上 | ✅ |
| R1 | 表单不提交 | e2e R1 URL 断言；validation not.toHaveBeenCalled（修复后真实） | 覆盖 | 注入验证（修复批正向对照） | ✅ |
| R2 | 含空格/非法字符提示 E-02 | validators + validation + e2e R2 | 覆盖 | 注入验证（USERNAME_RE 破坏 → validators 红；E2E 改文案 → 红） | ✅ |
| R2 | 17 位超长提示 E-02 | 同上三处 | 覆盖 | 同上 | ✅ |
| R2 | 改填合法后消失 | validation.test.tsx:112-117 + e2e:91-93 | 覆盖 | 附带失败输出 | ✅ |
| R2 | 输入不被过滤（D-12） | validation.test.tsx:95/106（value 回读）+ e2e:76/85-87 | 覆盖 | 附带失败输出 | ✅ |
| R3 | 纯数字拒 | validators + e2e R3 | 覆盖 | 附带失败输出 | ✅ |
| R3 | 21 位拒 | validators:55 + validation:120-134 | 覆盖（E2E 无此形态，M-4） | 附带失败输出 | ✅ |
| R3 | abcd1234 通过 | validators:38/110 | 覆盖 | 附带失败输出 | ✅ |
| R4 | 注册未勾选不提交 | e2e R4 URL 断言 | 覆盖 | 附带失败输出（T11） | ✅ |
| R4 | 勾选框错误高亮 | validation:188-207 aria-invalid + e2e:181 | 覆盖 | 附带失败输出 | ✅ |
| R4 | 登录表单无协议行 | validation:136-141 显式（E2E 间接，M-2） | 覆盖 | 附带失败输出 | ✅ |
| R5 | 文案切换+置灰 | submission:128-160 + e2e:241-251 | 覆盖 | 附带失败输出 | ✅ |
| R5 | 期间不得重复提交 | disabled + `if (submitting) return`（AuthScreen:142-144/159-161）；无二次点击断言（M-1） | 缺口（他层结构保证） | 层级抽样旁证 | ✅（M-1） |
| R6 | 已/未建档两账号均落承接页 | e2e R6×2（session-account 一致） | 覆盖 | 附带失败输出 | ✅ |
| R7 | 三情形接口层文案一致 | endpoints「未注册/错密码/空密码…」三集合长度=1 | 覆盖 | 注入验证（403 hook 破坏 → endpoints 红；同文件同链路） | ✅ |
| R8 | E-02/E-05 逐项、表单不提交 | validation:145-186 + e2e R8 | 覆盖 | 附带失败输出 | ✅ |
| R9 | 会话建立并落承接页 | 集成三文件 + submission + e2e | 覆盖 | 附带失败输出 | ✅ |
| R10 | E-07 且仅一条记录 | service:70-84（恰 1 行）+ e2e:263-273 | 覆盖 | 注入验证（单约束 → service R10 红） | ✅ |
| R10 | 去登录带入账户名 | submission:184 + e2e:273 | 覆盖 | 附带失败输出 | ✅ |
| R11 | 直访/后退挡回、重登完好 | e2e:306-335；endpoints:177-217 三处失效 | 覆盖 | 附带失败输出 | ✅ |
| R12 | 有历史返回 / 无历史进承接页 | auth-redirect.test 三分支 + e2e:331-349 | 覆盖 | 附带失败输出 | ✅ |
| R13 | 查库无明文 | 人工抽检（当次 3 条 161 位摘要 + LIKE 0 行） | 覆盖 | 当次查库直证 | ✅ |
| R13 | 查日志无明文 | E2E 全量日志 grep `e2ePass123` 0 处 | 覆盖 | 当次 grep 直证 | ✅ |
| R14 | 并发恰一成功一 E-07 | service:86-116（allSettled） | 覆盖 | 注入验证（单约束 → service R14 红） | ✅ |
| R14 | 唯一索引区分大小写 | service:118-145（大小写变体两行）+ migration.test pg_indexes + 查库直证 | 覆盖 | 注入验证同链路 | ✅ |
| R15 | 查库断言两字段 | service.test:41-52 + 人工抽检 3 条 | 覆盖 | 当次查库直证 | ✅ |
| R16 | 值保留/错误清除 | view-switch + e2e R16 | 覆盖 | 附带失败输出 | ✅ |
| R17 | 明文/密文互换 | validation:210-234 + e2e:110-129 | 覆盖 | 附带失败输出 | ✅ |
| design·状态转换 | 会话建立/撤销（R6/R11 承载） | endpoints 双写与三处失效 | 覆盖 | 附带失败输出 | ✅ |
| design·状态转换 | 已过期（无 R 承载，兜底） | getCurrentSession 异常/null 归一 + (app) 守卫承接（queries.test:42-44 无 cookie → null） | 覆盖（运行时行为经 Better Auth expires_at） | 层级抽样旁证 | ✅ |
| design·插件六配置项 | 与 F-01 对齐 | lib/auth.ts:53-66 + auth.test 源码同步守护 | 覆盖 | 注入验证（USERNAME_RE 破坏 → 守护红路径同链） | ✅ |
| design·403 三路径 | 邮箱端点 + 查重端点 | endpoints:101-121 三直连 403 | 覆盖 | 注入验证（移除第三路径 → 红） | ✅ |
| design·immutable | /update-user 改名被拒且库不变 | endpoints:123-147 | 覆盖 | 附带失败输出（T7） | ✅ |
| design·开放问题 #4 | 空表迁移假设 | 迁移 SQL 无 DEFAULT + 裁决 378 清库留痕 | 声明假设成立 | — | ✅ |

## 非目标逐条表

| 非目标 # | 内容 | 核对方法 | 实现现状 | 结果 |
| ---- | ---- | ---- | ---- | ---- |
| 1 | 短信验证码 | grep `sendOTP|otp|验证码|sms` 于 src/；注册表单字段 | 无 OTP 插件/发送逻辑/字段；verification 空表保留为 design 明示形态（去留归后续清理迁移） | ✅ |
| 2 | 找回密码 | grep `resetPassword|forgetPassword|找回|忘记` | 零命中，无端点无入口 | ✅ |
| 3 | 第三方登录 | grep `socialProviders|wechat|微信|oauth` + 组件盘点 | 无配置无按钮（account 表 OAuth 列为 Better Auth 核心既有结构，本期恒空） | ✅ |
| 4 | 邮箱注册登录 | hook 403 + 集成断言 + 占位邮箱 UI 零暴露 + 邮箱形态走 E-02 | endpoints.test:101-121 三端点 403；`user.styb.invalid` 仅存 service 派生与测试；submission:222-234 无特例直证 | ✅ |
| 5 | 协议正文与法务 | AgreementCheckbox 无 `<a>`/href；仅落库版本时间 | 纯文本「我已阅读并同意《用户协议》与《隐私政策》」 | ✅ |
| 6 | 2FA/魔术链接/组织插件 | plugins 数组盘点（server+client） | 仅 `username` / `usernameClient({ displayUsername: false })` | ✅ |
| 7 | 记住我/多端管理 | signIn 调用参数 + 路由盘点 | 不传 rememberMe（AuthScreen:129-132）；无相关路由界面 | ✅ |
| 8 | 企业/高校对接 | grep `企业|高校` | 零命中 | ✅ |
| 9 | 信息录入引导 | 成功链路跳转 + grep `档案|录入|引导|跳过|onboard|profile` | 一律 replace(workbench)；零命中 | ✅ |

## 裁决记录落实核对

**CR-20261116-1 修订重走执行期新增裁决（tasks.md:372-393，20 条）逐条核到代码，全部落实**：双约束映射（service.ts:47-51 + design.md:270-271 指针，双侧）、大小写互变对（service.test:118-128）、uniquePhone 零残留（代码 grep 0，仅 docs 历史记述）、限流 production-only 备查（endpoints.test.ts:17-19 文件头）、directGetSession 局部函数（endpoints.test:48-56）、E2E 字段 id 定位（全用例贯彻）、节流打点时机（helpers:74-79）、开放问题 #1/#2 闭合回写（design.md:521-522 处置列）、R4/E-06 证据归属披露（本报告 M-7 呈现）、中间红归属与勘误类条目为执行期历史事实（git 提交序列可验，收口态无残留）。

原版 43 条裁决为历史原貌（其中基建类经原 review 全量核验继续有效：hooks.before 形态、trustedOrigins 兜底、validateSchema:false、drizzleAdapter 显式 schema、casing 烘焙等本报告在契约核对中复核仍成立；凭据类仅存史）。

## 发现清单

| 严重度 | 发现 | 位置 | 修复建议 |
| ---- | ---- | ---- | ---- |
| Important（已闭合） | authClient 桩键残留 `phoneNumber`：`not.toHaveBeenCalled` 恒真（实现调用 signIn.username），合法值改填用例经 TypeError→catch→unknown 异常分支仍绿——「绿得错误」的测试完整性缺陷。**终审修复批已闭合**：桩键换 username、默认 resolve `{ data, error }`、补正向对照断言（合法值提交到达边界恰一次）、头注更新；修复后 110/110 全绿 | tests/auth/components/validation.test.tsx:34（修复前） | 已修复（本提交）；正向对照断言防复发 |
| Minor | R5「重复点击不产生重复提交」无 pending 期间二次点击断言（disabled + submitting 守卫在码） | AuthScreen.tsx:142-144/159-161 | 测试提质阶段补组件用例（fireEvent 双击断言调用数 1） |
| Minor | R4「登录表单无协议行」无 E2E 显式断言（组件层显式、E2E 汇总计数 2 间接）——proposal 测试层标 E2E 与实际归属漂移 | e2e/auth.spec.ts R1 用例 | 测试提质阶段补一行 `expect(page.locator('#login-agreement')).toHaveCount(0)` 或调整 proposal 测试层归属 |
| Minor | R12「响应不含表单」无 E2E 载体（组件层 route-guards 承载；design 测试接缝写 E2E） | e2e/auth.spec.ts R12 用例 | 同上（`request.get('/login')` 已登录断言 body 不含表单标识） |
| Minor | R3 E2E 仅纯数字形态（21 位/通过例在单元+组件层）；「三处一致」靠单源结构保证无逐字段断言 | e2e/auth.spec.ts R3 | 测试提质阶段补 E2E 形态或调整测试层归属 |
| Minor | R8「无验证码字段」无负向断言（结构缺位 + 非目标 grep） | tests/ | 测试提质阶段酌补 |
| Minor | workbench 页双检守卫无专属单测（E2E B6 间接经过，与 layout 守卫不可区分） | tests/auth/route-guards.test.tsx | 测试提质阶段补 page 级用例 |
| Minor | E-06 无浏览器级 E2E 呈现断言（裁决 393 已披露；R7 双半边在集成+组件，proposal R7 测试层本为集成） | e2e/auth.spec.ts | 维持现归属（裁决在案）；测试提质可补复验 |
| Minor | view-switch 测试数据「13800138000」为手机号形态残留（F-01 下合法，无功能影响） | tests/auth/components/view-switch.test.tsx:49/57 | 换 `zhang_san` 类账户名数据 |
| Minor | queries.ts `username ?? ''` 与 `new Date()` 归一未在 design 契约块展示（任务卡明示、原版裁决等价形态） | queries.ts:33/38 | 文档颗粒度差异，无需动作（design 侧至多一行注记） |
| Minor | 迁移 SQL 语句顺序与 design 代码块不同（DROP INDEX 前置；语句集合相同，drizzle-kit 生成序，语义等价） | src/db/migrations/20261116074441_crazy_molly_hayes/migration.sql | 无需动作，如实记录 |
| Minor | `Routes` 类型与 index.ts `RegisterInput` 再导出无消费者（前者 design 契约原样，后者模块公共面预置） | src/lib/routes.ts:7；modules/auth/index.ts:15 | 无需动作，记录在案 |
| Minor | R13 人工抽检「各 3 条」无独立存档工件（本次终审已当次补做：查库 3 条摘要 + 日志 grep 0 处，见证据附录；自动化归 C-05） | — | 测试提质阶段按 C-05 裁定 |

## 性能与质量移交清单（测试提质）

| Q 编号 | 原文 | 验收归属 | 度量方式 | 移出依据（D-09） |
| ---- | ---- | ---- | ---- | ---- |
| Q1 | 登录/注册接口 p95 响应时间 ≤ 500ms（开发环境，每接口 ≥ 100 次采样） | 测试提质阶段 | 压测或脚本采样记录 | D-09：Q 条目验收后置 |
| Q2 | `/login` 页面首屏可交互 ≤ 2s（开发环境） | 测试提质阶段 | CI 流水线 + e2e 实测记录 | D-09：Q 条目验收后置 |

## 证据附录（全部为 2026-11-16 当次运行）

| 命令 | 运行时间 | 输出摘要 |
| ---- | ---- | ---- |
| `npm run type-check && npm run lint && npm run lint:circular` | 17:52–17:55 | 全部干净退出（链式，任一失败即中止） |
| `npm test` | 17:53 | 16 文件 110/110 全过（2.35s） |
| `npm run test:integration` | 17:54 | 5 文件 17/17 全过（1.72s，真实 PG/Redis） |
| `npm run test:e2e` | 17:54–17:55 | 14 passed（42.4s，含生产构建；auth 13 + homepage 1） |
| `npm test`（终审修复批后复验） | 18:01 | 16 文件 110/110 全过（2.40s） |
| 注入①：validators.ts USERNAME_RE 临时排除中文 → `node scripts/run-vitest.mjs run tests/auth/validators.test.ts` | 18:02 | **红**：1 failed（「接受中文、字母、数字、下划线组合」）| 25 passed → 恢复后绿 |
| 注入②：lib/auth.ts 403 hook 临时移除 `/is-username-available` → endpoints.test.ts | 18:03 | **红**：1 failed（「三路径直连均 403」）| 4 passed → 恢复后绿 |
| 注入③：service.ts 23505 映射临时收窄单约束 → service.test.ts | 18:04 | **红**：2 failed（R10 同名再注册 + R14 并发同名——精确重现执行期 user_email_key 先抛的发现）→ 恢复后绿 |
| 注入④：e2e R2 期望文案临时改错 → `npx playwright test -g "R2"` | 18:05 | **红**：1 failed（R2 用例 toHaveText 不匹配）→ 恢复后绿 |
| R13 人工抽检：E2E 全量运行日志 `grep -c "e2ePass123"` | 18:05 | **0 处**（该次运行含多次注册与登录） |
| R13/R15 人工抽检：`docker exec studybuddy-postgres psql`（三查询） | 18:05 | `password LIKE '%e2ePass123%'` 0 行；3 条 credential 均 161 位摘要；3 条 user 均 agreement_version='v1' + agreed_at 非空；另直证 `UMWJ3HPFF0DB74`/`umwj3hpff0db74` 大小写两行共存（R14/F-01） |

**证据不足测试清单：** 无。全部关键条目以注入验证或当次运行直证覆盖；其余以 tasks 裁决记录中间红归属图 + 层级抽样旁证承接（方式已在测试质量核对表逐行注明）。

审查过程产物：4 个只读取证子代理（校验文案层 / 服务端数据层 / 流程守卫 E2E / 非目标契约质量）分片报告 → 主会话直接读码复核 4 处关键论断（桩键残留、AuthScreen 异常归一、双约束映射、六配置项）+ 注入验证 4 处 + 人工抽检 2 项 + 终审修复批（本提交）。

---

## 历史报告（CR-20261116-1 前的手机号凭据版，墓碑保留）

> **历史报告注记**：以下为 2026-11-14 针对手机号凭据实现的终审报告原文（审查基线 `4a7774c`，含修复批 `b6fdd6b`）。该实现已按 CR-20261116-1 部分回滚改造（实现基线 merge commit `baa88ea`），**判定结论保持历史原貌不改，不得作为新 review 依据**；新终审见上文（核对源：proposal v4 + 修订版 design）。变更管理依据见 [change-record](../../product/AXY-8-auth/change-record.md)。

| 对应规范 | [proposal.md](../../product/AXY-8-auth/proposal.md) | 审查日期 | 2026-11-14 |
| ---- | ---- | ---- | ---- |
| 审查基线 | feat/axy-8-auth，HEAD `4a7774c`（含终审修复批 `b6fdd6b` + `4a7774c`） | 判定 | **通过** |

### 判定（历史）

**通过。** R1–R19 全部有实现落点与当次通过的测试证据（豁免清单仅 Q1/Q2，登记完整）；非目标 9 项零越界；契约与 design 的偏离全部有裁决记录且已回写；发现清单无 Critical，2 项 Important 均已闭合或如实披露为流程记录缺口，Minor 为测试覆盖建议与跨浏览器遗留。

审查方式：全部验证命令由主会话当次运行取新鲜证据（证据附录）；R 条目落点核对、非目标越界检查、契约与裁决核验由只读审查子代理执行，其四处关键论断（FormSummary 计数语义、redis 死导出、route 导出面、auth.ts 陈旧注释）经主会话直接读码复核证实。

### 逐条核对表（历史）

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

### 非目标越界检查（历史，9 项零越界）

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

### 契约与裁决核验（历史）

- design 契约表与实际签名**逐项一致**（validators/service/queries/actions/errors/routes/auth-client/组件 props/布局守卫）。
- 全部契约偏离均有裁决记录：hooks.before 单中间件、trustedOrigins 兜底、drizzleAdapter 显式 schema、`validateSchema: false`、AuthRedirect 阈值 `>2`、drizzle client 形态——且 design.md 已补「实现裁决注记」回写（`4a7774c`）。
- tasks.md 裁决记录 43 条（含 spec-review 批次 5 条）逐条核到代码，无「记了裁决代码没有」或反向漏记。
- design 开放问题 #1/#2 的实测闭合结论已回写，与实现注释互相印证。

### 发现清单（历史）

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

### 豁免待验清单（历史，移交测试提质）

| # | 要求原文 | 豁免理由 | 去向 |
| - | ---- | ---- | ---- |
| 1 | Q1：登录/注册接口 p95 响应时间 ≤ 500ms（开发环境，每接口 ≥ 100 次采样） | AC 无性能条目，压测环境与采样脚本未建立（提出者确认 2026-11-14） | 测试提质 |
| 2 | Q2：`/login` 页面首屏可交互 ≤ 2s（开发环境） | 同上 | 测试提质 |

### 证据附录（历史，全部为 2026-11-14 当次运行）

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

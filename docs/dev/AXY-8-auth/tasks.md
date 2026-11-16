---
title: 'Tasks: AXY-8 登录注册'
description: 登录注册的实现计划(微任务拆分/TDD 步骤/Interfaces)
sidebar_position: 3
---

# AXY-8 登录注册 实现计划

**Goal:** 按修订版 design（CR-20261116-1）将登录注册凭据由手机号改造为账户名+密码：删被替换行为与旧迁移列，TDD 重建注册事务与登录端点链路，协议勾选收窄至注册表单。

**Date:** 2026-11-16

**Spec:** docs/product/AXY-8-auth/proposal.md（需求规范,权威，v4）
**Design:** docs/dev/AXY-8-auth/design.md（架构设计,契约来源，2026-11-16 修订获批）

**修订:** CR-20261116-1（2026-11-16）——本版为账户名凭据改造计划，替换原手机号版任务卡；已建成且凭据无关的基建（routes/redis、db 底座、集成测试基座、i18n 设施、CI、路由壳与守卫组件）不重跑。**旧版 13 任务的执行期形态与全部实现裁决保持历史原貌存于 git 与本文「裁决记录」节**；变更管理依据见 [change-record](../../product/AXY-8-auth/change-record)。实现基线：merge commit `baa88ea`。

## Global Constraints

- 依赖零新增：username 插件属 `better-auth@^1.7`（1.7.23）包内能力，`package.json` 不动。
- 校验正则单一来源：`USERNAME_RE = /^[一-龥A-Za-z0-9_]{1,16}$/`（F-01/F-03，区分大小写）、`PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/`（不变）；`src/lib/auth.ts` 内联副本与 validators 的同步性由单测守护。
- 文案精确值：13 个 next-intl 键（design 文案表）中文文案逐字照抄；E-01「请输入账户名」、E-02「格式不对：1—16 位中文、字母、数字或下划线」、E-07「该账户已注册，去登录」；E-03/E-05/E-06 及其余保留键文案逐字不变；废弃键 `register.phoneInvalid`、`error.phoneRegistered` 删除。E2E 断言以页面渲染文案为准。
- D-12：账户输入框**不做字符过滤**——无 `maxLength`、无受控过滤逻辑，提交时校验。
- D-13：协议勾选仅存在于注册表单；登录表单无协议勾选行、无对应 props。协议错误在勾选框旁呈现、不进顶部汇总计数（D-01）。
- username 插件配置四要件（server 与 client 两端一致）：`usernameValidator`（USERNAME_RE）、`minUsernameLength: 1`、`maxUsernameLength: 16`、`usernameNormalization: false`、`displayUsername: false`、`immutableUsername: true`。
- hook 403 三路径：`/sign-up/email`、`/sign-in/email`、`/is-username-available`；唯一索引显式名 `user_username`，service 层 23505 按约束名映射为 `USERNAME_ALREADY_REGISTERED`。
- R7 纪律：任何失败情形不得出现可探测账号存在性的差异文案。R13 纪律：service/action 及调用链不记录入参；密码只存 `hashPassword` 摘要（`盐:哈希`）。
- 会话配置不动：`storeSessionInDatabase: true`（Redis 首查 + PG 兜底）、7 天有效期、退出同步失效 Redis 键与 PG 行。
- 迁移纪律（CR §5）：**新增迁移承载删列增列，不改旧迁移** `20261114052112_perpetual_songbird`。空表假设（design 开放问题 #4）：迁移执行前核对 user 表行数，存量行环境先人工处置。
- 旧测试处置（CR §5）：被替换行为的测试**删除**（不 skip）；保留行为的测试断言按 v4 更新；删除清单随改造 commit 回填 change-record §8。
- 类型禁推断：`modules/`、`components/` 内导出函数显式返回类型；模块内部一律相对导入（禁自引用顶入口）。
- TDD 铁律：一切产品代码先写失败的测试再实现；每任务收尾跑 `npm test`（及至该任务为止已建的 `npm run test:integration`）。
- 测试命令经 `scripts/run-vitest.mjs` 包装（Windows 盘符问题，勿直接调 vitest CLI）。
- Next 16 与训练数据有破坏性差异：写 App Router 代码前先读 `node_modules/next/dist/docs/` 相应指南。
- 执行环境：集成/E2E 需本地 PG/Redis（`compose.dev.yaml`）；`npm run build` 在**无 .env** 的环境必须仍成功。
- 提交：Conventional Commits，中文描述。
- Q1/Q2 由测试提质阶段验收（D-09）：**不安排任何性能验证任务**。

## 不安排任务

| design 非目标 # | 刻意不做 | 理由 |
| ---- | ---- | ---- |
| 1 | 短信验证码的发送与校验 | D-12 凭据改版废止，无恢复场景；无 OTP 插件、无 sendOTP；verification 表去留归后续清理迁移（不属本 CR） |
| 2 | 找回密码 | 账户名+密码体系下本期未定义；入口已随 D-08 删除 |
| 3 | 第三方登录（微信等） | 无对接方；入口已随 D-08 删除 |
| 4 | 邮箱注册与邮箱登录 | D-12：唯一凭据为账户名；邮箱端点与查重端点 hook 403（封闭守卫测试归 Task 7，不属覆盖非目标） |
| 5 | 协议正文与法务审阅 | 仅落库协议版本与同意时间；协议名纯文本无链接（D-08） |
| 6 | 2FA、魔术链接、组织等插件能力 | ADR-0013 按需启用，本期 plugins 仅 username |
| 7 | 「记住我」、多端会话管理界面 | 用户故事未涉及 |
| 8 | 企业/高校账号对接 | 品牌区已标注本期不支持 |
| 9 | 新用户信息录入引导与「跳过」 | D-05：建档与登录注册分离，录入入口归后续业务故事 |

## Review Focus

1. **大小写区分失效（F-01/R14）**：`usernameNormalization` 未关或唯一索引折叠，Alice/alie 变体被合并或登录查找折叠 → Task 4 配置断言（normalization:false 同步守护）+ Task 5 并发大小写变体恰两账号 + 大小写错配登录失败。
2. **登录三情形差异文案（R7）**：端点换 `/sign-in/username` 后「未注册/错密码/空密码」若返回不同状态/文案即暴露账号存在性 → Task 7 三情形状态码+code+message 集合长度 = 1（design 开放问题 #1 闭合点）。
3. **已登录直连改名（负空间无改名语义）**：`immutableUsername` 失效则 `/update-user` 可改凭据 → Task 7 已登录 POST /update-user 改 username 被拒且 user 行不变。
4. **账户名枚举面（R7 延伸）**：`/is-username-available` 未拦则可无会话探测账户名存在性 → Task 7 三路径 403 断言。
5. **登录表单协议行残留（D-13）**：LoginForm 遗留 AgreementCheckbox 或 props → Task 8「登录表单无协议行」断言 + Task 11 E2E R1。
6. **输入过滤回归（D-12）**：maxLength/受控过滤混入使「zhang san!」/17 位无法完整输入 → Task 8 输入完整保留断言（input.value 回读）+ Task 11 E2E。
7. **占位邮箱探测面（B2）**：`/sign-in/email` 403 失效则占位邮箱成凭据 → Task 7 覆盖。
8. **换插件破坏会话双写（R11/B5）**：插件换装后 Redis 键/PG 行增删回归 → Task 7 双写与退出三处失效重验。
9. **workbench testid 残留（B10）**：`session-phone` 未改名则 E2E 锚点失效 → Task 10 改名 + Task 11 断言 `session-account`。

## 执行纪律（全局声明一次，任务卡不重复）

每个任务默认按 TDD 六步执行：

1. **写失败测试**（测试名与断言见任务卡「失败测试」行，spec 的精确值写在测试里）；
2. **运行测试，确认以「预期失败」所述方式失败**；
3. **在「实现」落点完成最小实现**；
4. **运行测试，确认通过**；
5. **运行全量测试套件，确认全绿**；
6. **按「提交」信息提交**。

被替换行为的既有测试随所在任务**同任务删除**（CR §5：删，不 skip）；保留行为的测试改断言后再跑绿。

## 任务

### Task 1: validators.ts 换装（纯函数校验）

**Files:** Modify `src/modules/auth/validators.ts` · Test `tests/auth/validators.test.ts`

**Interfaces:**
- Consumes: 无（纯函数，无依赖）。
- Produces（design 契约原样）:
  - `USERNAME_RE`（Global Constraints 值）、`PASSWORD_RE`（不变）；**删除** `PHONE_RE`、`EMAIL_RE`、`AccountKind`
  - `type AccountCheck = { ok: true } | { ok: false; messageKey: 'auth.account.required' | 'auth.account.invalid' }`（无 kind 分支）
  - `validateAccount(raw: string): AccountCheck`
  - `validatePassword`（签名不变）
  - `type RegisterFormErrors = Partial<{ username: 'auth.account.invalid'; password: 'auth.password.required' | 'auth.password.invalid'; confirmPassword: 'auth.register.passwordMismatch'; agreement: 'auth.agreement.required' }>`
  - `validateRegisterForm(v: { username: string; password: string; confirmPassword: string; agreementAccepted: boolean }): RegisterFormErrors | null`

**失败测试:** 重写 `tests/auth/validators.test.ts`——USERNAME_RE 组（接受 `zhang_san`/`张三`/`Alice`/`a1_`；拒绝 `zhang san!`（含空格）、17 位 `abcdefghijklmnopq`、含 `@`、空串）；PASSWORD_RE 组（原 5 例不动）；validateAccount（''→required；`zhang san!`→invalid；17 位→invalid；`name@mail.com`→invalid；`zhang_san`→`{ok:true}`——**无 kind 字段**）；validateRegisterForm（username `zhang san!` → `{ username: 'auth.account.invalid' }`；password/confirmPassword/agreement 各例保留改字段名；多字段合并；全合法 → null）。**删除**：PHONE_RE 组 5 例、EMAIL_RE 组 3 例、kind 分类 2 例。

**预期失败:** FAIL——USERNAME_RE 导出不存在、AccountCheck 无 kind 断言形态不匹配。

**实现:** `USERNAME_RE` 常量 + `validateAccount` 重写为单一规则（空→required，正则→ok，否则 invalid）；`validateRegisterForm` phone 分支改 username（同一正则与 messageKey）；confirmPassword/agreement 分支逐字保留。

**提交:** `feat(auth): 账户名校验纯函数换装,删手机号邮箱规则`

---

### Task 2: i18n auth.json 13 键修订

**Files:** Modify `src/locales/zh-CN/auth.json` · Test `tests/i18n/messages.test.ts`、`tests/i18n/request.test.ts`

**Interfaces:**
- Consumes: 无（文案值来自 design 文案表）。
- Produces: `useTranslations('auth')` 命名空间 13 个叶子键——`account.required='请输入账户名'`、`account.invalid='格式不对：1—16 位中文、字母、数字或下划线'`、`error.usernameRegistered='该账户已注册，去登录'`；**删除** `register.phoneInvalid`、`error.phoneRegistered`；其余键文案逐字不变。

**失败测试:** messages.test.ts 重写键值断言（13 键逐字，含删键后的结构断言：`register` 命名空间仅剩 `passwordMismatch`）；request.test.ts 逐字断言改 `auth.account.required === '请输入账户名'`。

**预期失败:** FAIL——auth.json 仍为 14 键旧文案。

**实现:** 改 3 键值、删 2 键；设施（request.ts/next.config/layout）零改动。

**提交:** `feat(i18n): auth 文案换装账户名凭据,删手机号键`

---

### Task 3: schema.ts user 表改造与新增迁移

**Files:** Modify `src/modules/auth/schema.ts`（user 表 + registerInputSchema） · Create `src/db/migrations/<timestamp>_axy8_username_credential/`（`npm run db:generate` 生成） · Test `tests/auth/schema.test.ts`、`tests/integration/auth/migration.test.ts`（新建查库断言）

**Interfaces:**
- Consumes: `USERNAME_RE`、`PASSWORD_RE`（Task 1，模块内相对导入）。
- Produces:
  - drizzle `user` 表：`username: text().notNull()` + `uniqueIndex('user_username').on(t.username)`；**删除** `phoneNumber`、`phoneNumberVerified` 列与 `user_phone_number` 索引；`email/name/agreementVersion/agreedAt` 等其余列不变；`account/session/verification` 表不动
  - `registerInputSchema`：`username: z.string().regex(USERNAME_RE)` + `password/confirmPassword/agreementAccepted`（refine 不变）+ `type RegisterInput`
  - 新增迁移 SQL：`ADD COLUMN "username" text NOT NULL` + `CREATE UNIQUE INDEX "user_username"` + `DROP COLUMN "phone_number"` + `DROP COLUMN "phone_number_verified"`；旧迁移目录零改动

**失败测试:** schema.test.ts 更新——user 表组：`username 列 notNull`、`唯一索引显式命名 user_username`（新增）；**删除** `phoneNumber 列 notNull`、`user_phone_number 索引` 2 例；`emailVerified/phoneNumberVerified` 例改 `emailVerified` 单列；registerInputSchema 组改 username 入参（新增 >16 位/非法字符/17 位拒绝；**删除** 10 位手机号例）。migration.test.ts（集成，真实 PG）——`pg_indexes` 含 `user_username`、`information_schema.columns` 含 username 不含 phone_number/phone_number_verified。

**预期失败:** FAIL——schema.ts 尚无 username 列（单测）；查库无 username 列/索引（集成）。

**实现:** 先改 schema.ts 跑绿单测；再跑集成查库断言（红）→ 前置核对 `SELECT count(*) FROM "user"` 为 0（Global Constraints 空表假设）→ `npm run db:generate` 生成新迁移并人工核对 SQL 逐条一致（不改旧迁移目录）→ 集成跑绿（globalSetup 自动应用迁移链）。

**提交:** `feat(auth): user 表 username 唯一列与新增迁移,删手机号列`

---

### Task 4: lib/auth.ts 插件换装与 auth-client.ts

**Files:** Modify `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/app/api/auth/[...all]/route.ts`（仅注释） · Test `tests/lib/auth.test.ts`、`tests/lib/auth-client.test.ts`

**Interfaces:**
- Consumes: `db`、`redis`、schema 表、`USERNAME_RE`（Task 1/3）。
- Produces:
  - `auth`（betterAuth 实例）：plugins 仅 `username({...})`（Global Constraints 六配置项）；hooks.before 403 三路径；`emailAndPassword` 块与 session/secondaryStorage/validateSchema:false/trustedOrigins 配置逐字保留；内联 `USERNAME_RE` 副本替换 PHONE_RE
  - `auth.handler`（不变）；`authClient`：`usernameClient({ displayUsername: false })`，`authClient.signIn.username({ username, password })`、`authClient.signOut()`

**失败测试:** auth.test.ts——源码同步守护改 `USERNAME_RE`（读 auth.ts 提取正则字面量断言 source 相等）；`betterAuth()` 初始化成功断言保留。auth-client.test.ts——`typeof authClient.signIn.username === 'function'`（**design 开放问题 #2 闭合点**：方法名不一致则停下记裁决并回写 design 开放问题表再继续）、`signOut` 保留；**删除** `signIn.phoneNumber` 例。

**预期失败:** FAIL——auth.ts 仍 import phoneNumber 插件（模块求值差异）；auth-client 无 username 方法。

**实现:** 插件换装照 design 契约代码块逐项（含注释取舍依据）；route.ts 仅更新文件头端点注释（`/sign-in/username` + 三条 403 路径）；限流注释随裁决语义改写（`/sign-in` 前缀 specialRule 3 次/10 秒覆盖 `/sign-in/username`）。

**提交:** `feat(auth): username 插件换装与端点注释更新,禁账户名枚举端点`

---

### Task 5: service.ts 注册事务换装 + 集成重写

**Files:** Modify `src/modules/auth/service.ts`、`tests/integration/helpers.ts`（`uniquePhone` → `uniqueUsername`） · Test `tests/integration/auth/service.test.ts`

**Interfaces:**
- Consumes: schema `user` 表（Task 3）、`hashPassword`（better-auth/crypto）。
- Produces:
  - `AGREEMENT_VERSION = 'v1' as const`（不变）
  - `usernameToPlaceholderEmail(username: string): string`（`` `${username}@user.styb.invalid` ``）
  - `type RegisterOutcome = { ok: true; userId: string } | { ok: false; error: 'USERNAME_ALREADY_REGISTERED' }`
  - `registerWithUsername(input: { username: string; password: string }): Promise<RegisterOutcome>`（单事务插 user + credential account；PG 23505 且约束 `user_username` → USERNAME_ALREADY_REGISTERED；全链路不记录入参）——错误情形：同名已注册返回 error 判别分支，不抛
  - helper `uniqueUsername(): string`（替换 `uniquePhone`，返回不重复合法账户名）

**失败测试:** 重写 service.test.ts——①注册成功（R9/R13/R15）：user 行 `name=username`、`email=${username}@user.styb.invalid`、`username=username`、`agreement_version='v1'`、`agreed_at>用例开始时间`；account 行 `provider_id='credential'`、`account_id=user.id`、password 摘要 `^\S+:\S+$` 且不含明文、verifyPassword 回验 true；②同名再注册（R10）：error 判别分支 + user 表恰 1 行；③并发同名（R14）：`Promise.allSettled` 两次同名 → 恰一 ok 一 USERNAME_ALREADY_REGISTERED；④**并发大小写变体（R14/F-01）**：`Alice` 与 `alice` 并发注册 → 两账号均成功、两行共存。**删除**：原手机号 3 例。

**预期失败:** FAIL——registerWithUsername/usernameToPlaceholderEmail 不存在，uniquePhone 断言失败。

**实现:** `registerWithPhone` 改名重写：插 user 半边字段替换（username/name/占位邮箱），account 半边与 agreement 写入逐字保留；`isPhoneUniqueViolation` → `isUsernameUniqueViolation`（cause 链探测 23505 + 约束名 `user_username`；email 冲突不再映射——占位邮箱派生注入式唯一，不可碰撞）。

**提交:** `feat(auth): 账户名注册事务与大小写变体并发集成验证`

---

### Task 6: actions / queries / errors 换装

**Files:** Modify `src/modules/auth/actions.ts`、`src/modules/auth/queries.ts`、`tests/integration/helpers.ts`（`signInAndGetCookie` 端点改 `/sign-in/username`） · Test `tests/auth/errors.test.ts`、`tests/integration/auth/actions.test.ts`、`tests/integration/auth/queries.test.ts`、`tests/auth/route-guards.test.tsx`（会话桩同步）

**Interfaces:**
- Consumes: `registerWithUsername`、`registerInputSchema`（Task 5/3）；helpers `uniqueUsername`（Task 5）。
- Produces: `signInAndGetCookie(username, password)`（端点已指向 `/sign-in/username`，Task 7 复用）。
- Produces:
  - `type RegisterActionResult = ... | { ok: false; error: 'USERNAME_ALREADY_REGISTERED' }`
  - `registerAction`（`'use server'`，zod 复验 → registerWithUsername）
  - `type AuthSession = { user: { id: string; name: string; username: string }; session: {...} }`（phoneNumber → username）
  - `mapSignInError`（逻辑不变）

**失败测试:** errors.test.ts——`{status:400, code:'INVALID_USERNAME_OR_PASSWORD'}` → invalidCredentials（旧 `INVALID_PHONE_NUMBER` 字面量替换）；其余 5 例不动。actions.test.ts——合法入参（账户名形态）→ ok:true 且库有行；`username 'zhang san!'` → INVALID_INPUT + `fieldErrors.username`；同名重复 → USERNAME_ALREADY_REGISTERED（**删除** 10 位手机号例）。queries.test.ts——AuthSession 形状断言 `user.username`（name=账户名）。route-guards.test.tsx——会话桩 `AuthSession` 字段同步（行为断言不动）。

**预期失败:** FAIL——actions 错误字面量与字段名仍为 phone 族；queries 桩无 username。

**实现:** actions `issueToFieldErrors` phone 分支改 username；错误字面量替换；queries `raw.user.username ?? ''` 归一（沿用原裁决形态，注释同步）；`getCurrentSession` try/catch 归一不动。

**提交:** `feat(auth): 注册 action 与会话查询换装账户名字段`

---

### Task 7: 端点集成——R7 三情形、hook 403 三路径、immutable 与会话双写

**Files:** Test `tests/integration/auth/endpoints.test.ts`（helpers `directPost`/`signInAndGetCookie` 已由 Task 5/6 就位，本任务复用）

**Interfaces:**
- Consumes: `auth.handler`（Task 4）、`registerWithUsername`（Task 5）、helpers `directPost`/`signInAndGetCookie`/`uniqueUsername`（Task 5/6）。

**AC / 演示态:** 无（集成层，R7/R11 服务端半边 + 守卫断言）

**失败测试:** 重写 endpoints.test.ts——①R7 三情形：先 `registerWithUsername` 造真实账号；`/api/auth/sign-in/username` 三次 directPost（①未注册账户名+任意密码 ②已注册+错密码 ③已注册+空密码绕过前端）→ 状态码/code/message 集合长度 = 1 且无「未注册」「密码错误」类差异字样（**design 开放问题 #1 闭合点**：原生不一致则触发 design 兜底——登录改 Server Action 包装 `auth.api.signInUsername`，记裁决并回写 design 开放问题表）；②hook 403：`/sign-up/email`、`/sign-in/email`、`/is-username-available` 直连均 403；③immutable：注册并登录后携 cookie POST `/update-user`（body 含新 username）→ 4xx（USERNAME_IS_IMMUTABLE 族）且查库 user.username 不变；④登录成功双写（B5）：200 + set-cookie，PG session 行 + Redis 会话键同存；⑤退出失效（R11）：sign-out 后旧 cookie get-session 无用户、Redis 键删、PG 行删。**删除**：原 `/sign-in/phone-number` 三情形例、旧二路径 403 例。

**预期失败:** FAIL——helpers 端点路径指向已不存在的 phone-number 端点（连接层失败即形态正确）；403 第三路径新断言失败。

**实现:** 测试任务 + helpers 胶水，无新增产品代码（开放问题 #1 兜底除外）。

**提交:** `test(auth): username 端点三情形统一文案与守卫集成验证`

---

### Task 8: 表单组件改造（渲染层）

**Files:** Modify `src/modules/auth/components/AccountField.tsx`、`LoginForm.tsx`、`RegisterForm.tsx`、`FormSummary.tsx` · Delete `src/modules/auth/components/PhoneField.tsx` · Test `tests/auth/components/validation.test.tsx`

**Interfaces:**
- Consumes: `validateAccount`/`validateRegisterForm`（Task 1）、auth.json 新键（Task 2）、`useTranslations('auth')`。
- Produces:
  - `AccountField`（单一实现，两表单共用）：label「账户名」、`autoComplete="username"`、**无 maxLength、无字符过滤**、无 type/inputMode 特化
  - `LoginForm` props：**无** `agreementAccepted/agreementError/onAgreementChange`（D-13）；字段 `account/password`
  - `RegisterForm` props：`phone/phoneError/onPhoneChange` → `account/accountError/onAccountChange`；`AgreementCheckbox` 行保留
  - `FormSummary` errors 键集：`'phone'` → `'username'`

**失败测试:** 重写 validation.test.tsx——登录链（R1/R2/R3）：账号留空+密码 a1234567 → 「请输入账户名」+「有 1 项需要修改」，不提交；双空 → 「有 2 项需要修改」；`zhang san!` 与 17 位 → E-02 逐字，**断言输入框 value 完整保留所输字符（无过滤）**，改填 `zhang_san` 后提示消失；密码例不动；**新增登录表单无协议行断言**（query 勾选框/协议文案均不存在）；**删除**登录侧协议 aria-invalid 例。注册链（R8）：`zhang san!` → E-02；确认密码例逐字保留；未勾选 → aria-invalid。R17 显隐例不动（定位器改）。view-switch.test.tsx 同任务更新（标签引用与 E-01 文案；切视图保值断言不动）。

**预期失败:** FAIL——AccountField 旧 label/placeholder 文案；LoginForm 仍渲染协议行。

**实现:** AccountField 重写文案与去 tel/maxLength 特化；LoginForm 删协议行与三 props；RegisterForm 换 AccountField 删 PhoneField 文件与 import；FormSummary 键集替换。Tailwind 4 手写、模块内相对导入不变。

**提交:** `feat(auth): 账户名输入框单一实现,登录表单删协议勾选行`

---

### Task 9: AuthScreen 提交流程换装

**Files:** Modify `src/modules/auth/components/AuthScreen.tsx` · Test `tests/auth/components/submission.test.tsx`

**Interfaces:**
- Consumes: `registerAction`（Task 6）、`authClient.signIn.username`（Task 4）、`mapSignInError`、`ROUTES`、Task 8 组件 props。
- Produces 行为契约（Task 11 依赖）：注册成功 → `authClient.signIn.username` 自动登录 → `router.replace(ROUTES.workbench)`；登录成功同 replace；`handleLoginSubmit` 无协议校验、无邮箱特例分支（邮箱形态经 validateAccount 走 E-02 字段错误）；R10 顶部文案可点切登录并带入账户名。

**失败测试:** 重写 submission.test.tsx——R9：registerAction ok → `signIn.username` 以 `{username, password}` 被调 → replace('/workbench')；R5 两文案+disabled 例不动（填充助手改标签）；R10：USERNAME_ALREADY_REGISTERED → 「该账户已注册，去登录」，点击切登录且账户框带入该账户名；R7 客户端 401/429 两例不动；R6 落点例改 payload 断言 `{username}`；**删除** B2 邮箱短路例（新增替代：邮箱形态提交 → 不发请求、呈现 E-02 字段错误「格式不对：…」）；**删除**登录侧协议例。

**预期失败:** FAIL——AuthScreen 仍调 `signIn.phoneNumber`、仍含登录协议校验与邮箱短路分支。

**实现:** `signInWithPhoneNumber` → `signInWithUsername`；`AuthMessageKey`/`AuthFormErrors`/fieldErrors 映射键换装（phoneInvalid → username/account.invalid；phoneRegistered → usernameRegistered）；`handleLoginSubmit` 删 L198-206 协议校验与 L211-214 邮箱短路（D-13/B2 新语义）；顶部错误可点分支改 usernameRegistered。

**提交:** `feat(auth): 登录注册提交流程换装 username 端点与错误映射`

---

### Task 10: workbench 承接页与会话展示

**Files:** Modify `src/app/(app)/workbench/page.tsx` · Test `tests/auth/route-guards.test.tsx`（如涉桩）

**Interfaces:**
- Consumes: `AuthSession.user.username`（Task 6）、`SignOutButton`。
- Produces: workbench 占位显示 `session.user.username`，`data-testid="session-account"`（AXY-12 替换；E2E 验收锚点）。

**失败测试:** 全局 grep 断言（或 route-guards 桩例）：`session-phone` 字样在 src/ 与 e2e/ 中为 0 处；E2E 前置占位页渲染断言改 `session-account`。

**预期失败:** FAIL——页面仍读 `session.user.phoneNumber`（字段已不存在，type-check 即红）。

**实现:** 页面字段与 testid 替换；守卫双检与 SignOutButton 不动。

**提交:** `feat(auth): 工作台承接页展示账户名`

---

### Task 11: E2E 全流程换装

**Files:** Modify `e2e/helpers/auth.ts`、`e2e/auth.spec.ts`

**Interfaces:**
- Consumes: 全部前序产物（生产构建 + 真实 PG/Redis）。
- Produces: E2E 证据（R1–R6、R8–R12、R16–R17 浏览器级；R7 双半边证据在 Task 7/9）。

**AC / 演示态:** AC-1～AC-7；演示态 1 登录 / 2 校验失败 / 3 登录中 / 4 注册 + 重置专态（对应 design 演示态映射表）

**失败测试:** helpers 换装——`uniqueUsername()`（替换 uniquePhone）、`fillLoginForm` 删协议勾选行步骤（D-13）、`registerViaUI` 改账户名填充 + `session-account` 断言、route mock 改 `**/api/auth/sign-in/username`。用例组：R1（空表单 → E-01 + 汇总计数，**无协议错误断言**）、R2（`zhang san!`/17 位 → E-02，输入完整保留，改填消失）、R3/R17（定位器改，断言不动）、R4（**注册侧**未勾选不提交+错误态，勾选解除；**删除**登录侧协议例）、R5/R9/R10（注册成功落工作台；`sign-in/username` 拦截延迟断言「登录中…」；重复注册 → E-07 切登录带账户名）、R6×2（两账号注册→退出→登录均落 /workbench，session-account 一致）、R11/R12（退出三挡回 + 重登数据完好；有历史 back / 直开 replace）、B6（未登录响应不含 `session-account` 等受保护标识）、R16（保值清错 + replaceState）。

**预期失败:** FAIL——记录失败清单（预期为文案/端点/助手胶水缺口；若全绿逐条核对断言强度后提交信息注明）。

**实现:** 测试即交付物；发现产品缺陷回对应任务模块修复并补单测（偏离记裁决）。

**提交:** `test(e2e): 登录注册全流程换装账户名凭据`

---

### Task 12: 全量回归与 change-record 闭合回填

**Files:** Modify `docs/product/AXY-8-auth/change-record.md`（§5/§8 回填）

**Interfaces:**
- Consumes: 全部前序任务产物。
- Produces: change-record §5 改造 commit 列表回填；§8 测试删除清单 + 三套件全绿证据；记录状态改「已闭合」。

**失败测试:** 无新增测试文件（验证方式见步骤）。

**实现步骤:** ①`npm run type-check` + `npm run lint` + `npm run lint:circular` 干净退出；②`npm test` 全绿；③`npm run test:integration` 全绿（真实 PG/Redis）；④`npm run test:e2e` 全绿；⑤汇总各任务的被替换测试删除清单（文件+用例名）回填 §8；⑥改造 commit hash 链回填 §5；⑦`npm run docs:build` 绿。

**提交:** `chore(auth): CR-20261116-1 改造收尾,变更记录回填闭合`

---

## 裁决记录

执行中发现的计划缺陷记入此处，格式：`裁决: <决定了什么> — <为什么> — <错了的代价>`。**以下为原手机号版执行期裁决（2026-11-14～11-15，历史原貌保留；其中基建类裁决对修订版继续有效，凭据类裁决仅存史**：

- 裁决: drizzle-orm 版本范围由 `^1` 改为 `^1.0.0-rc.1`（Task 1） — npm 上 1.x 仅有 rc/beta（stable latest 为 0.45.4），semver `^1` 不匹配 prerelease 导致安装失败；`^1.0.0-rc.1` 恰落在 better-auth 1.7.23 peerOptional 允许区间 `>=1.0.0-rc.1 <2.0.0`，stable 发布后可自动升级 — rc 版 API 稳定性风险，后续任务遇 rc 破坏性变更需回头调整
- 裁决: redis 单测中 ioredis 类经动态 import 获取（Task 1） — 静态 import 会使 Step 2 先报 `Cannot find module 'ioredis'`，偏离任务预期的 `Cannot find module '@/lib/redis'` 失败形态；断言内容不变 — 测试代码略绕，无功能影响
- 裁决: `.gitignore` 补 `!.env.example` 例外（Task 1） — 既有 `.env*` 通配会把任务要求入库的 `.env.example` 一并忽略 — 无
- 裁决: compose.dev.yaml 的 redis 未配持久化卷（Task 1） — 任务原文仅要求 postgres 数据卷；redis 仅作会话缓存，重建即失效可接受 — dev 环境 Redis 数据不跨容器重建保留
- 裁决: confirmPassword 一致性检查仅在 password 自身校验通过时执行（Task 2） — 任务用例「password '' → 仅返回 password 一项错误」与「confirmPassword 为空即不一致」的字面叠加互相矛盾（会同时返回 confirmPasswordMismatch）；密码本身不合法时不再叠加不一致错误，与任务注记「确认密码强度由与 password 一致间接保证」一致，且符合表单 UX — 若产品期望密码错误时同时提示确认框，需回改 validators 与测试
- 裁决: drizzle-kit 由 ^0.31.11 升至 ^1.0.0-rc.5、新装 zod ^4.6.7（Task 3） — drizzle-kit 0.31.11 要求 orm 兼容 API v10 而 drizzle-orm 1.0 RC 报 v14，db:generate 硬性退出，钉死版本组合无法产出迁移；zod 此前仅为传递依赖，显式直用需入 dependencies（同版本无漂移） — 均为 RC 通道版本，stable 发布后需复核升级
- 裁决: casing 从 client/config 运行时选项改为表定义时 `snakeCase.table(...)` 烘焙（Task 3） — drizzle-orm 1.0 RC 删除了运行时 casing 选项（以 node_modules 类型实测为准）；语义不变（camelCase 属性名 → snake_case 列名），已验证迁移 SQL 逐列一致 — 后续任务建表须沿用此写法，不得再传 casing 选项
- 裁决: db client 类型为 `PostgresJsDatabase`，经 `defineRelations` + `drizzle({ client, relations })` 构造（Task 3） — 任务原文的 `NodePgDatabase` 与 postgres-js 驱动不匹配；RC 的 pg driver 配置 Omit 了 schema，表关系须单独经 relations 传入 — Task 4 的 drizzleAdapter 接 db 时注意此形态
- 裁决: `src/db/schema.ts` barrel 内部用相对导入而非 `@/modules/auth/schema`（Task 3） — drizzle-kit 的 esbuild 不解析 tsconfig 路径别名，别名导入使 db:generate 失败 — 与「模块内相对导入」纪律方向一致，无代价
- 裁决: 迁移目录布局为 `<timestamp>_<name>/migration.sql + snapshot.json`（Task 3） — drizzle-kit 1.0 RC 改目录式布局（0.x 为平铺单文件）；Task 5 集成基座的 migrator 应用路径须按此布局传 `migrationsFolder: 'src/db/migrations'` — 无
- 裁决: drizzleAdapter 显式传 `schema: { user, account, session, verification }`（Task 4） — drizzle-orm 1.0 RC 移除 client 构造的 schema 运行时选项（`db._.fullSchema` 为 undefined），适配器 schema 回退实际查询会抛「Schema not found」；Task 3 裁决的 RC 变更延伸，不改表结构 — 无
- 裁决: `hooks.before` 落成单个 `createAuthMiddleware` 函数而非 design 的数组形态（Task 4） — design 所写数组形态是插件级 hook 的形状，`@better-auth/core` 选项级 `hooks.before` 在 1.7 为单个 AuthMiddleware；语义等价（`createAuthMiddleware`/`APIError` 自 `better-auth/api` 导出） — design 代码示意与实现形态不一致，后续读 design 者需知此映射
- 裁决: trustedOrigins 兜底 `[process.env.BETTER_AUTH_URL ?? 'http://localhost:3000']`（Task 4） — design 契约用 `!` 非空断言，无 .env 环境数组会混入 undefined；与无 .env 构建守卫一致 — 无
- 裁决: `docker build --target runner` 本地验证跳过（Task 4） — Docker Desktop daemon 未运行；`npm run build`（无 .env）已同验通过 — docker 构建守卫延至 Task 13 本地核对时补验
- 裁决: 23505 唯一冲突映射的约束名扩为 `user_phone_number` + `user_email_key`（Task 5） — 占位邮箱由手机号确定性派生，email 列 UNIQUE 先于 phone 唯一索引抛出（集成实测），仅认 user_phone_number 会漏判 R10/R14；email 冲突当且仅当同号已注册，语义等价（design 原文只写 user_phone_number） — 若未来出现非手机号派生的邮箱注册路径，此等价不再成立，需收紧
- 裁决: drizzle RC 的 `drizzle()` 仅接受配置对象形态 `drizzle({ client })`，且 migrate 的 23505/constraint_name 在 `DrizzleQueryError.cause` 链上探测（Task 5） — `drizzle(client)` 位置参数被 RC 静默忽略（自建无凭据连接致 28P01）；错误包装形态以 node_modules 类型与集成实测为准 — 后续任务凡构造 drizzle 实例/判 PG 错误码均沿用此形态
- 裁决: `src/db/client.ts` 类型注解扩为 `PostgresJsDatabase & { $client: postgres.Sql }`（Task 5） — `db.$client` 运行时存在但被原注解抹去，集成测试 teardown 需要；保持显式类型纪律，未改运行时行为 — 无
- 裁决: `src/lib/auth.ts` 新增 `advanced.database.validateSchema: false`（Task 6，超出任务预授权的产品代码改动，需人工知悉） — better-auth 1.7 运行时 schema 校验要求 user 表所有 notNull 无默认列必须由 Better Auth 写入，否则每请求抛错；`agreementVersion`/`agreedAt`（R15 留痕）由 registerWithPhone 写入而 Better Auth 无可达 user 插入路径（sign-up/email 被 hook 403、OTP 注册因 no-op sendOTP 不可利用），校验属误报，关掉是库方唯一开关 — 全局关闭 schema 校验：后续若新增 Better Auth 表列而不更新 adapter schema，将失去这层防线；备选（两列加默认值/改 nullable）要动迁移，代价更大未取
- 裁决: `vitest.config.integration.ts` env 注入 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`（Task 6） — better-auth 1.7 无 secret 时 `betterAuth()` 模块求值即抛错，端点直调测试必须先注入；helpers 模块求值后补设不可靠，只能落在 config env — Task 13 的 CI job env 须覆盖同组变量
- 裁决: 回溯清残留——Task 8/9/12 中 R18/R19 占位入口（ForgotPasswordLink / OAuthPlaceholder / 两文案键）相关内容删除，文案键 16→14 — D-08（2026-11-15）废止占位入口，实现与测试已先行删除（88988d1），计划对齐榜样基线 — 无（执行期历史见 git 88988d1；任务卡其余保持执行期原形态）
- 裁决: `mapSignInError` 对裸 400（无 code）也映射 invalidCredentials（Task 7） — design 注释「任一登录失败（含格式拒绝）→ invalidCredentials」，格式拒绝即 400 族，故按 status 判定不细究 code；code 参数保留在签名供未来细化 — 若未来 400 族出现非凭据类错误（如参数畸形），会误报为「账号或密码不对」，可接受（R7 统一文案方向）
- 裁决: `queries.ts` 的 `raw.user.phoneNumber ?? ''` 归一（Task 7） — Better Auth 1.7 的 user 类型标注 phoneNumber 可空，而本产品注册路径恒有值；归一空串仅为满足 AuthSession 契约类型 — 若出现 phoneNumber 为空的真实会话，workbench 会显示空手机号（理论上不可达）
- 裁决: 根布局加 `export const instant = false`（Task 8） — Next 16.4.6 `cacheComponents: true` 下 getMessages() 经 cookies() 使预渲染报「uncached or runtime data during prerendering」；cookie 语言协商是 ADR-0010 硬要求，豁免为 Next 官方迁移指南推荐手段（注释已注明回迁条件：语言协商迁至 proxy 后移除） — 全站路由标记 ƒ（Dynamic），失去静态预渲染；ADR-0010 终态（proxy 层协商）落地时须回迁
- 裁决: 根布局 `lang="en"` 改 `lang="zh-CN"`（Task 8） — 与 ADR-0010 唯一目标语言 zh-CN 对齐 — 无
- 裁决: `vitest.config.ts` 增 next-intl/next 的单测解析适配（Task 8） — 单测环境无 react-server 导出条件，`next-intl/server` 解析到 react-client 桩即抛错；适配为生产等价接线（react-server 构建 + config 别名 + next/headers 显式扩展名），仅影响单测解析不改产品构建 — 适配指向 next-intl 内部构建路径，升级 next-intl 大版本时可能需复核
- 裁决: FormSummary 汇总计数不含协议勾选错误（Task 9） — 任务自测用例「账号留空+密码合法+协议未勾选 → 有 1 项需要修改」与「按全部 errors 键数计数」矛盾（后者为 2）；协议错误仍单独呈现（勾选错误态），与线框图行为一致；实现为 AuthScreen 下发给 FormSummary 的 errors 不含 agreement — 汇总数与字段错误数语义分离，后续改文案计数规则时两处要同步
- 裁决: PasswordField 显隐布尔与 ForgotPasswordLink 提示显示态保留为组件内局部 state（Task 9） — design「状态提升」清单仅列 activeView/表单值/errors/submitting 四项；显隐是三输入框各自独立的同构状态，提升反而破坏复用 — 若未来需要跨字段统一显隐，需改 PasswordField props
- 裁决: 非 16 键的结构性布局文案（「手机号 / 邮箱」「注册并进入」「微信登录」等）硬编码中文于组件（Task 9） — auth.json 键清单（16 键）不含布局文案，与 Task 8 最小 i18n 设施一致 — 后续扩 i18n 键时改动点集中在各字段组件；多语言启动前需补齐
- 裁决: `authClient.signIn.phoneNumber` 失败按 `{ data: null, error: { status, ... } }` 返回值处理而非 reject（Task 10） — better-auth 1.7 客户端经 @better-fetch 未设 `throw: true`，失败不 reject；实现取 `result.error` 喂 mapSignInError，try/catch 仅兜网络层异常归一 unknown（否则测试绿而真实链路坏） — Task 11/12 依赖此行为契约，不得假设 reject 形态
- 裁决: R10「去登录」以整条文案渲染为单个可点按钮（Task 10） — 16 键文案被 messages.test.ts 逐字锁定（`该手机号已注册，去登录`），不拆分不增键；行为满足 R10（切视图+带入手机号） — accessible name 为全句；若产品要求仅「去登录」三字可点，需改文案结构并动键清单
- 裁决: 布局 Props 用 `LayoutProps<"/">` 而非文档示例的 `LayoutProps<'/login'>`（Task 11） — Next 16.4.6 实测 typegen 后 routes.d.ts 的 LayoutRoutes 只有 "/"（路由组布局按 `LayoutConfig<"/">` 校验），文档示例与实际版本不符；测试调用布局须补 `params: Promise.resolve({})` — Next 升级若改变 LayoutRoutes 生成规则需复核
- 裁决: `instant = false` 豁免扩至两个组布局与 workbench 页（Task 11） — getCurrentSession → headers() 必然无法静态预渲染，与根布局同类（Task 8 裁决的延伸），实现时即加并注释 — 全站四路由均为 Dynamic；ADR-0010 proxy 终态落地时统一回迁
- 裁决: AuthRedirect 渲染 `role="status"` 占位（「正在进入…」）而非 null（Task 11） — 任务测试要求断言「AuthRedirect 在」，纯 null 组件无法从 DOM 断言存在 — 占位文案一闪而过，无验收影响
- 裁决: workbench 页在布局守卫外再次 getCurrentSession + 未登录 redirect（Task 11） — 契约总表本就列 workbench 页为调用方；形成纵深防御且以 redirect(never) 做类型收窄（免非空断言） — 与 (app) 布局守卫双查一次会话，轻微冗余可接受
- 裁决: AuthRedirect 的历史阈值由 `history.length > 1` 改为 `> 2`（Task 12，**产品缺陷修复**） — E2E 实测 Chromium 新标签页直开任意 URL 时初始 about:blank 占一个历史槽位，首次导航后 length 即为 2；原 `> 1` 使「无来路 → replace 工作台」分支在真实浏览器中永不可达且 back() 退到空白页；单测同步改（length=3→back；length=2/1→replace），114→115 用例 — 无历史分支的语义依赖浏览器实现细节，跨浏览器验证（Firefox/WebKit）时需复核
- 裁决: 登录限流语义修正为 Better Auth 内置特殊规则 3 次/10 秒（Task 12） — 实测源码：生产构建限流默认开启，`/sign-in/*` 命中 specialRule 3 次/10 秒；phoneNumber 插件的 10 次/60 秒 pathMatcher 只覆盖顶层 OTP 路径、不覆盖 `/sign-in/phone-number`（任务原文与 design 的「插件 10 次/60 秒」认知有误）；E2E 以 `workers: 1` + 相邻登录间隔 ≥3.5s 节流应对，未绕过限流 — 真实用户连续错 3 次密码 10 秒内会遇 429（R7 文案链路已含 tooManyAttempts 分支，行为正确）
- 裁决: B6 未登录直访 /workbench 的形态为 200 + `x-nextjs-postponed: 1` postponed shell（Task 12） — cacheComponents 流式渲染下 redirect 在客户端完成，非任务预期的 307；B6 实质要求「响应原文不携带受保护内容」成立（body 不含受保护标识，浏览器级最终落 /login），断言按实测书写 — 若安全审计要求服务端 307/重定向状态码，需调整 (app) 布局守卫的渲染策略
- 裁决: webServer 无需手动 env 注入——Next 16 的 `next start` 自动加载 `.env`（Task 12） — build 日志首行即 `Environments: .env`，全绿即证 secret 注入成功；任务注意事项「Next 不会自动读 .env」的假设与实测不符 — CI（Task 13）需注意：`npm run start` 起的 webServer 读的是 CI job env，本地 .env 不存在
- 裁决: CI services 的 DATABASE_URL/REDIS_URL 用 `localhost` + 显式 ports 映射而非服务别名 DNS（Task 13） — verify job 是 VM runner（runs-on ubuntu-latest 无 container:），GitHub 官方语义下宿主机 steps 无法解析 service 容器别名，别名 DNS 仅对 container-based job 成立 — 若日后 job 改容器化运行，连接串需换回别名
- 裁决: E2E 前置迁移选显式 `npm run db:migrate` 步骤而非复用集成 globalSetup（Task 13） — 任务原文两案皆可；显式步骤消除对「集成测试步骤已跑过」的隐式顺序依赖 — 多一个幂等步骤，无实质代价
- 裁决: `src/lib/redis.ts` 的 `createRedis` 去掉 export、内部化为单例工厂（spec-review 批次） — grep 全仓确认唯一调用方是同文件的 `export const redis = createRedis()`，对外契约只有 `redis` 单例本身，export 属契约外暴露；`maxRetriesPerRequest: null` 保留并补注释（ioredis 该选项禁用每命令重试上限，配合 lazyConnect 避免 Redis 抖动时命令快速失败） — 无
- 裁决: API route 全量导出 GET/POST/PATCH/PUT/DELETE 五方法（spec-review 批次补记档） — design 示意仅 GET/POST，而 `toNextJsHandler(auth.handler)` 返回的对象即含五方法集合，route.ts 以 `export const { ... } = toNextJsHandler(...)` 全量透传，文件头注释已有说明；此处补记 design 与实现的导出面差异 — 若未来 Better Auth 增删方法集合，route 导出面随库版本变化，需复核
- 裁决: 限流语义陈旧注释纠偏（spec-review 批次） — `src/lib/auth.ts` 与 `tests/integration/helpers.ts` 的注释仍写「phoneNumber 插件 10 次/60 秒限制/防 429」，与 Task 12 裁决实测结论（内置 specialRule 登录路径 3 次/10 秒，插件规则不覆盖顶层 sign-in 路径）矛盾；随裁决更新两处注释表述，代码不动 — 无
- 裁决: design.md 回写 `hooks.before`/`validateSchema` 实现裁决注记、proposal.md 同步 R6 验证方式（spec-review 批次） — Task 4 裁决（hooks.before 为单个 `createAuthMiddleware`）、Task 6 裁决（`advanced.database.validateSchema: false`）均承诺「待 design 回写」，proposal R6 的 PO 修订（2026-11-14，非目标 #9 废除建档概念）未同步到验证方式单元格；一并闭合文档欠账 — 无
- 裁决: R1 汇总计数的「项」定义为字段项（账号/密码/手机号/确认密码），协议勾选错误不进顶部汇总、仅在勾选框旁单独呈现（spec-review 终审，提出者裁决 2026-11-14） — Task 9 裁决已将协议错误定为局部态，R4 独立定义了协议错误的呈现通道（勾选框高亮），两条文互补而非重叠；proposal R1 措辞随裁决同步修订 — 若未来 UX 评审认为汇总应含协议项，需同改 FormSummary 传参与单测/E2E 断言

**以下为 CR-20261116-1 修订重走执行期新增裁决（追加于此，不改写上行历史）：**

- 裁决: 修订版任务序列存在已知中间红，且红例归属图随文案换装扩大（Task 2 收口态 `npm test` 13 failed | 95 passed (108)；基线勘误为 9 红|99 绿，Task 1 报告的「98|10」系笔误）。归属图：schema.test 5→T3、lib/auth.test 1→T4、validation.test 4（旧 2 + 文案换装新增 2）→T8、submission.test 2（旧 1 + R10 文案新增 1）→T9、view-switch.test 1（文案换装新增）→T8；`type-check` 错误数随卡递减（5→T3 后 4→T4 后 3→T6 后 1→T9 后 0） — 凭据换装的消费者测试分散在 T3/T4/T6/T8/T9 各卡，单卡提前修复等于并卡提交，破坏任务拆分与 PR 拆分纪律；文案键删除物理上必然击穿渲染锚定断言，属预期红 — 中间红禁止他卡修复；Task 12 三套件全绿收口
- 裁决: AuthScreen.tsx 三处引用已删键 `auth.error.phoneRegistered`（类型并集 ：80、setTopError :172、三元渲染 :277），T9 前该路径渲染缺失消息 — 键删除在 T2、组件换装在 T9 是任务排序的既定中间态；运行时仅影响分支内部，无真实用户 — T9 落地后消除，无额外动作
- 裁决: type-check 中间态为 17 处（T3 后），远超卡面「剩 4 处」预估——删 registerInputSchema 的 phone 键使潜伏级联类型错显形，全部落在 T5/T6/T9 将整体重写的文件（service.ts、actions.ts、AuthScreen.tsx 及对应集成测试） — 卡面预估只数了 T1 报告的直接错误，未含 zod 类型级联；顺手修复即越权改他卡文件 — T5/T6/T9 重写后自然清零，T12 type-check 干净收口
- 裁决: 集成套件中间红基线 T3 后为 10 failed | 5 passed (15)——旧手机号流程测试在新 schema（username NOT NULL）下必红：service.test 3→T5、actions.test 3→T6、queries.test 1→T6、endpoints.test 3→T7 — 迁移先行于消费重写是「新增迁移不改旧」纪律的必然结果 — 各卡重写后 T12 集成全绿收口
- 裁决: 空表假设失效触发授权清库（design 开放问题 #4）——dev 库实测 user 181 行/account 181 行/session 49 行（既有测试数据，compose 卷持久化），迁移前 `TRUNCATE "account","session","verification","user" RESTART IDENTITY CASCADE` — ADD COLUMN NOT NULL 在存量行上必失败，0.1.0 无生产数据，处置符合 design 声明的「迁移前人工处置（清库）」分支 — 生产化前若出现真实存量数据，须按开放问题 #4 回流 proposal 追认回填策略
- 裁决: drizzle-kit RC 对「删列+增列」歧义检测需 `--hints` 显式 create 消歧；生成 SQL 首行多一条规范 `DROP INDEX "user_phone_number"`（删列前显式删索引，语义与随列删一致）；迁移目录名 `20261116074441_crazy_molly_hayes` 为生成名不重命名 — RC 工具链行为，以实际产物为准记录 — 无
- 裁决: auth-client 方法名守护的「预期红」结构性不可达成——better-auth 1.7.23 客户端为 Proxy，任意属性路径运行时均返回 function（探针实证），`typeof === 'function'` 断言对插件换装不敏感；断言照 design 开放问题 #2 指定形态保留，闭合证据由类型面承载（usernameClient 生成 `signIn.username({username,password,rememberMe?,callbackURL?})` 类型化签名，type-check 0 错）——**开放问题 #2 闭合（T4，2026-11-16）**：signIn.username 成立，无需回写 design 契约 — 运行时守护弱于类型面，未来 SDK 若改生成规则需复核
- 裁决: 「无 .env 的 npm run build 仍须成功」门禁在 T3 级联中间态下推迟——stash 实证基线（17 错）与 T4 态（20 错）均在 Next build 的 type-check 阶段中止，失败全在他卡文件；betterAuth 模块作用域无 env 不抛错的设计意图已另行探针实证 — 门禁待 T6/T8/T9 类型错清零后恢复，T12 收口复核
- 裁决: helpers 的 `uniquePhone` 保留至 T7 才删除（T5 只新增 `uniqueUsername`）——actions.test/endpoints.test（T6/T7 卡文件）仍 import 它，提前删除会改变他卡红的失败形态而非红例归属 — T7 重写 endpoints 后删最后一个消费者 — 无
- 裁决: 卡面「email 冲突不可达、不再映射 user_email_key」被实证证伪——psql 直插与集成实测均显示同名再注册时 PG 先抛 `user_email_key` 23505（表级约束先于 user_username 索引检查），仅认 user_username 的版本聚焦 2 failed；修正为**双约束映射**（user_username ∨ user_email_key → USERNAME_ALREADY_REGISTERED），语义等价：占位邮箱由账户名单射派生 + 两约束均区分大小写 → email 冲突当且仅当同名冲突（与原手机号版 Task 5 同构偏离） — design 契约注释只写了 user_username 单约束，实测约束触发顺序不同 — 若未来出现非派生邮箱的写入路径，等价不成立需收紧；design 侧已留一行指针不改契约块
- 裁决: 测试 4 的 `Alice`/`alice` 裸字面量会在二次运行撞 compose 卷持久化的 user_username 残留行——改为 `uniqueUsername()` 整串大小写互变对（lower/upper，均 F-01 合法、跨运行唯一），区分大小写直证语义不变 — 测试数据跨运行持久化 — 无
- 裁决: type-check 收口 18 处而非约 15 处——registerWithPhone 改名使 3 个卡外消费者新增 TS2305 缺失导出（actions.ts:17、integration/queries.test.ts:25、integration/endpoints.test.ts:23），均在 T6/T7 范围，按「他卡文件不得修」纪律保留 — T6/T7 重写后清零 — 无
- 裁决: type-check 基线计数两处勘误（T6 实测）——queries.test 基线 1 处而非卡面 2 处（user.phoneNumber 断言在基线类型下合法）；T6 收口 11 处而非预期 6 处，差额为 AuthSession 换装的下游涟漪（workbench/page.tsx TS2339 新增 1→T10、AuthScreen TS2367/TS2339 新增 2 与 submission.test TS2820 新增 1→T9） — 字面量联合类型换装的比较点/消费点级联无法前置枚举 — 剩余 11 处分布：AuthScreen 6（T9）、submission.test 2（T9）、workbench 1（T10）、validation.test 1（T8）、endpoints.test 1（T7），T9/T10 后清零
- 裁决: errors.test「换字面量后无红」属断言换字的正常形态（mapSignInError 按 status 判定、code 不参与逻辑），卡面已预判，照常走完六步 — 无
- 裁决: 限流 specialRule 默认仅 production 启用（better-auth create-context.mjs `rateLimit.enabled ?? isProduction`，vitest NODE_ENV=test），集成测试全程无 429 无需节流；E2E 生产构建下限流生效（原 Task 12 裁决语义继续成立） — 事实备查已写入测试文件头注释 — 无
- 裁决: GET /get-session 基座以测试文件内局部 `directGetSession` 落地（未扩 helpers 契约面）；实测响应原文经一次性探针测试取回后即删 — T7 卡仅授权删 uniquePhone，最小改动纪律 — 无
- **开放问题 #1 闭合（T7，2026-11-16）**：三情形原生统一 401 + INVALID_USERNAME_OR_PASSWORD（源码 index.mjs:157/172/186，含时序安全假哈希防探测），design 开放问题表已回写处置列

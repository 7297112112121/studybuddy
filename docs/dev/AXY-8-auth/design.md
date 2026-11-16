---
title: 'Design: AXY-8 登录注册'
description: 登录注册的架构设计(数据模型/契约/UI/组件)
sidebar_position: 2
---

# Design: AXY-8 登录注册

| 对应 Proposal | [AXY-8 登录注册](../../product/AXY-8-auth/proposal) | 状态 | 已批准 |
| ---- | ---- | ---- | ---- |
| 日期 | 2026-11-14 | 批准人 | 海渝（2026-11-14） |
| 回溯 | 2026-11-16 对齐榜样基线模板：新增补强节并清 D-08 残留 | 实现基线 | feat/axy-8-auth @ 88988d1 |

## 架构总览

认证底座为 Better Auth 1.7（[ADR-0013](../adr/better-auth)）：drizzleAdapter 接自有 PG、phoneNumber 插件提供手机号登录端点、`@better-auth/redis-storage`（ioredis）作 secondaryStorage，会话双写 PG + Redis。三个关键取舍：

1. **注册不走插件的 OTP 注册路径**（短信通道为本期非目标 #1），由 `modules/auth/service.ts` 在单事务内直接插表（user + credential account），密码经 `better-auth/crypto` 的 `hashPassword`（与核心同参数 scrypt）。这正是 phoneNumber 插件文档对迁移/种子用户要求的形态：「account 表存在 `providerId = "credential"` 记录即可用 `/sign-in/phone-number` 登录」。
2. **登录/登出由客户端 SDK 直调**（ADR-0013「客户端登录 UI 由官方客户端 SDK 驱动」）；**注册是表单突变，走 Server Action 判别联合返回**（[ADR-0025](../adr/client-data-layer)）。两个 ADR 的边界在此互补而非冲突。
3. **user.email 为 Better Auth 核心必填列**，本产品无邮箱账号，存确定性占位邮箱 `${phone}@phone.styb.invalid`（`.invalid` 为 RFC 2606 保留 TLD，永不展示、不投递）——与 phoneNumber 插件 `signUpOnVerification.getTempEmail` 的官方模式同构；`/sign-up/email`、`/sign-in/email` 端点经 before-hook 显式禁用（非目标 #4：仅手机号注册）。

分层遵循[代码目录](../代码目录)：`src/lib/` 放底座（auth 实例、auth-client、redis、路由常量），`src/modules/auth/` 按三段式落业务（本特性即「落地步骤 1」的样板模块），`src/app/(auth)`、`src/app/(app)` 为薄壳路由。会话策略：`storeSessionInDatabase: true`——Redis 为首要查询层、PG 兜底；退出登录时 Better Auth 同步删除 Redis 键与 PG 行（R11）。

实现阶段须先读 `node_modules/next/dist/docs/` 中 App Router 相关指南（AGENTS.md 约定：Next 16 与训练数据存在破坏性差异）。

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置（不覆盖/不引入的概念） |
| ---- | ---- | ---- |
| 1 | 短信验证码的发送与校验 | 不覆盖：不引入 OTP 发送/校验路径——`sendOTP` 置 no-op（码无处投递，端点不可被利用，边界 #4）；verification 表结构齐备但通道就绪前为空表 |
| 2 | 找回密码 | 不覆盖：无找回密码端点与入口组件（占位入口已随 D-08 删除，见 88988d1） |
| 3 | 第三方登录（微信登录、手机号一键登录） | 不覆盖：无 socialProviders 配置、无第三方登录按钮（已随 D-08 删除） |
| 4 | 邮箱注册 | 不覆盖：不引入邮箱注册路径——`/sign-up/email`、`/sign-in/email` 经 before-hook 403；user.email 仅存确定性占位邮箱，UI 永不展示 |
| 5 | 《用户协议》《隐私政策》正文内容与法务审阅 | 不覆盖：协议名纯文本、无链接（D-08）；仅落库协议版本与同意时间（R15） |
| 6 | 2FA、魔术链接、组织等 Better Auth 插件能力 | 不引入：plugins 仅 phoneNumber；ADR-0013 按需启用 |
| 7 | 「记住我」、多端会话管理界面 | 不覆盖：登录调用不带 rememberMe；无多端会话管理界面与路由 |
| 8 | 企业/高校账号对接 | 不覆盖：无对接代码与文案 |
| 9 | 新用户信息录入的引导与「跳过」交互 | 不覆盖：登录/注册成功一律 `router.replace` 工作台承接页，链路不查档案表、无信息录入路由（D-05） |

## 数据模型

**放置约定（本设计立样板）**：drizzle 表定义在 `src/modules/auth/schema.ts`（模块属主，含 zod 推导）；`src/db/schema.ts` 为公共契约 barrel（`export * from '@/modules/auth/schema'`，依赖规则 5「人人可读、写入仅属主」）；`src/db/client.ts` 以 `{ schema, casing: 'snake_case' }` 构造单例。迁移由 drizzle-kit 生成至 `src/db/migrations`（[ADR-0006](../adr/drizzle-orm)）。

```
user 1 ── N account（credential 记录持密码摘要）
user 1 ── N session（Redis 缓存 + PG 双写）
verification 独立（OTP 通道就绪前为空表，结构齐备）
```

| 实体 | 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| user | id | text | PK | `crypto.randomUUID()` |
| | name | text | NOT NULL | 注册时取手机号（与插件 `getTempName` 默认一致） |
| | email | text | NOT NULL UNIQUE | 占位邮箱 `phoneToPlaceholderEmail(phone)`，UI 永不展示 |
| | email_verified | boolean | NOT NULL default false | |
| | image | text | nullable | 本期不用 |
| | phone_number | text | NOT NULL UNIQUE | **R14 唯一索引**；合法域 `^1[3-9]\d{9}$` |
| | phone_number_verified | boolean | NOT NULL default false | 短信通道就绪后经 OTP 流程置真 |
| | agreement_version | text | NOT NULL | **R15**；当前 `'v1'`（协议正文为占位，非目标 #5） |
| | agreed_at | timestamptz | NOT NULL | **R15**；注册事务内写入 |
| | created_at / updated_at | timestamptz | NOT NULL default now() | |
| account | id | text | PK | uuid |
| | account_id | text | NOT NULL | credential 场景下 = user.id |
| | provider_id | text | NOT NULL | `'credential'` |
| | user_id | text | NOT NULL REFERENCES user(id) ON DELETE CASCADE | |
| | password | text | nullable | scrypt 摘要（`盐:哈希` 格式），**R13：永不存明文** |
| | access_token / refresh_token / id_token / token_type / scope | text | nullable | OAuth 场景才用，本期恒空 |
| | access_token_expires_at / refresh_token_expires_at | timestamptz | nullable | 同上 |
| | created_at / updated_at | timestamptz | NOT NULL default now() | |
| session | id | text | PK | |
| | token | text | NOT NULL UNIQUE | 会话令牌，同名为 Redis 键 |
| | user_id | text | NOT NULL REFERENCES user(id) ON DELETE CASCADE | |
| | expires_at | timestamptz | NOT NULL | 会话时长 7 天 |
| | ip_address / user_agent | text | nullable | |
| | created_at / updated_at | timestamptz | NOT NULL default now() | |
| verification | id | text | PK | |
| | identifier | text | NOT NULL | 手机号 |
| | value | text | NOT NULL | OTP 一次性令牌 |
| | expires_at | timestamptz | NOT NULL | |
| | created_at / updated_at | timestamptz | NOT NULL default now() | |

schema.ts 内的 zod 推导（服务端入参校验，边界 #1 双重校验的后端半边）：

```ts
export const registerInputSchema = z
  .object({
    phone: z.string().regex(PHONE_RE),
    password: z.string().regex(PASSWORD_RE),
    confirmPassword: z.string(),
    agreementAccepted: z.literal(true),
  })
  .refine((v) => v.password === v.confirmPassword);
export type RegisterInput = z.infer<typeof registerInputSchema>;
```

**状态转换（会话实体；账号实体单一状态「已注册」、无转换，proposal 11.2 口径）**：

| 起始态 | 触发 | 目标态 | 关联 |
| ---- | ---- | ---- | ---- |
| —（不存在） | 登录成功或注册成功自动登录 | 有效 | R6 / R9（路由行为 #2 / #3） |
| 有效 | 退出登录（Better Auth 同步删除 Redis 键与 PG 行） | 已撤销 | R11（路由行为 #4） |
| 有效 | 超过有效期（expires_at，7 天） | 已过期 | 边界 #5（ADR-0013）、路由行为 #1 |

已撤销 / 已过期会话访问受保护路由一律按路由行为 #1 挡回；重新登录建立**新会话**、原账号与数据完好（AC-7）。「已过期」为 Better Auth 按 expires_at 的运行时行为，经 `getCurrentSession` 返回 null 由 (app) 守卫承接——无 R 承载，终审由 spec-review 的 design 补强行为层核对。

## 契约

签名级精确；模块内函数一律显式返回类型（代码目录「类型禁推断」约定）。

### 环境变量（.env.example 增补）

```
BETTER_AUTH_SECRET=          # ≥32 字符随机串
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://studybuddy:***@localhost:5432/studybuddy
REDIS_URL=redis://localhost:6379
```

### src/lib/redis.ts

```ts
import Redis from 'ioredis';
/** 单例；REDIS_URL 连接；仅存可丢失数据（ADR-0007 纪律） */
export const redis: Redis;
```

### src/lib/auth.ts（Better Auth 实例，服务端 only）

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { phoneNumber } from 'better-auth/plugins';
import { redisStorage } from '@better-auth/redis-storage';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** 与 modules/auth/validators 的 PHONE_RE 保持一致（同步性由单元测试守护） */
const PHONE_RE = /^1[3-9]\d{9}$/;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // drizzle-orm 1.0 RC 移除 client 构造 schema 选项，适配器 fullSchema 回退
    // 不再可用，故在此显式传入表映射（Task 4 裁决）
    schema: { user, account, session, verification },
  }),
  secondaryStorage: redisStorage({ client: redis, keyPrefix: 'better-auth:' }),
  session: { storeSessionInDatabase: true, expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 20 },
  plugins: [
    phoneNumber({
      phoneNumberValidator: (phoneNumber: string) => PHONE_RE.test(phoneNumber),
      // 短信通道未就绪（非目标 #1）：OTP 端点可达但码无处投递，不可被利用；
      // 通道就绪后替换为真实发送实现（后续迭代）
      sendOTP: async () => {},
    }),
  ],
  // 选项级 hooks.before 在 Better Auth 1.7 为单个 AuthMiddleware，
  // 非插件级 { matcher, handler } 数组形态（Task 4 裁决）
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 非目标 #4：仅手机号注册。显式禁用邮箱注册/登录端点，防 API 直连绕过
      if (ctx.path === '/sign-up/email' || ctx.path === '/sign-in/email') {
        throw new APIError('FORBIDDEN', { message: 'Email auth is disabled' });
      }
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  // Better Auth 1.7 运行时 schema 校验对 registerWithPhone 直写的
  // agreementVersion/agreedAt 列（R15）误报 SchemaMismatchError，
  // 而本设计无自身可达的 user 插入路径，故关闭（Task 6 裁决）
  advanced: { database: { validateSchema: false } },
});
```

> 实现裁决（hooks.before 形态、validateSchema 关闭、drizzleAdapter schema 显式映射、trustedOrigins 兜底）见 tasks.md 裁决记录 Task 4 / Task 6。

`emailAndPassword.enabled: true` 是 phoneNumber 插件密码校验的基座；邮箱端点本身已被 hook 拦死。限流保持默认开启：内置 specialRule 对登录路径 3 次/10 秒（实测覆盖 `/sign-in/phone-number`，见 tasks.md Task 12 裁决），防凭证填充；phoneNumber 插件的 10 次/60 秒 rateLimit 规则不覆盖顶层 sign-in 路径。

### src/lib/auth-client.ts（客户端 SDK）

```ts
import { createAuthClient } from 'better-auth/client';
import { phoneNumberClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({ plugins: [phoneNumberClient()] });
// authClient.signIn.phoneNumber({ phoneNumber, password, rememberMe?: true })
//   : Promise<{ data?: { user; session }; error?: { code: string; message: string; status: number } }>
// authClient.signOut(): Promise<{ data?; error? }>
```

### src/lib/routes.ts（边界 #7：路由常量唯一来源）

```ts
export const ROUTES = { login: '/login', register: '/register', workbench: '/workbench' } as const;
export type Routes = typeof ROUTES;
```

### modules/auth/validators.ts（纯函数，零 IO，单元测试锚点）

```ts
export const PHONE_RE = /^1[3-9]\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;          // 「本地名@域名.后缀」
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;   // R3

export type AccountKind = 'phone' | 'email';
export type AccountCheck =
  | { ok: true; kind: AccountKind }
  | { ok: false; messageKey: 'auth.account.required' | 'auth.account.invalid' };

export function validateAccount(raw: string): AccountCheck;                    // R1/R2
export function validatePassword(
  raw: string,
): { ok: true } | { ok: false; messageKey: 'auth.password.required' | 'auth.password.invalid' }; // R3

export type RegisterFormErrors = Partial<{
  phone: 'auth.register.phoneInvalid';
  password: 'auth.password.required' | 'auth.password.invalid';
  confirmPassword: 'auth.register.passwordMismatch';
  agreement: 'auth.agreement.required';
}>;
export function validateRegisterForm(v: {
  phone: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
}): RegisterFormErrors | null;                                                // R8
```

### modules/auth/service.ts（写路径，注册事务）

```ts
import { hashPassword } from 'better-auth/crypto';

export const AGREEMENT_VERSION = 'v1' as const;
export function phoneToPlaceholderEmail(phone: string): string; // `${phone}@phone.styb.invalid`

export type RegisterOutcome =
  | { ok: true; userId: string }
  | { ok: false; error: 'PHONE_ALREADY_REGISTERED' };

/** 单事务：校验由调用方完成；插入 user（含 agreement_version/agreed_at）+ credential account（R9/R13/R15）*/
export async function registerWithPhone(input: { phone: string; password: string }): Promise<RegisterOutcome>;
// 错误情形：PG 23505 且约束为 user_phone_number 唯一索引 → PHONE_ALREADY_REGISTERED（R10/R14）
// 纪律：本函数与调用链不记录任何入参（R13 日志无明文密码）
```

### modules/auth/queries.ts（读路径，RSC 调用）

```ts
export type AuthSession = {
  user: { id: string; name: string; phoneNumber: string };
  session: { id: string; userId: string; expiresAt: Date };
};
/** auth.api.getSession({ headers: await headers() }) 的映射封装；未登录返回 null */
export async function getCurrentSession(): Promise<AuthSession | null>;
```

### modules/auth/actions.ts（'use server'，判别联合返回，ADR-0025）

```ts
export type RegisterActionResult =
  | { ok: true }
  | { ok: false; error: 'INVALID_INPUT'; fieldErrors: RegisterFormErrors }
  | { ok: false; error: 'PHONE_ALREADY_REGISTERED' };

/** registerInputSchema 复验（边界 #1 后端校验）→ registerWithPhone */
export async function registerAction(input: RegisterInput): Promise<RegisterActionResult>;
```

### modules/auth/errors.ts（R7 客户端统一文案映射，client-safe）

```ts
export type SignInErrorKey =
  | 'auth.error.invalidCredentials'
  | 'auth.error.tooManyAttempts'
  | 'auth.error.unknown';

/** 任一登录失败（用户不存在/密码错误/密码为空/格式拒绝）→ invalidCredentials；429 → tooManyAttempts */
export function mapSignInError(err: { status?: number; code?: string } | null | undefined): SignInErrorKey;
```

### 路由层薄壳

```ts
// src/app/api/auth/[...all]/route.ts —— Better Auth 全部端点（含 /sign-in/phone-number、/sign-out）
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth.handler);

// src/app/(auth)/layout.tsx（RSC）—— R12 守卫
const session = await getCurrentSession();
return session ? <AuthRedirect /> : children;   // 已登录不渲染表单

// src/app/(auth)/login/page.tsx、register/page.tsx（RSC 薄壳）
<AuthScreen initialView="login" | "register" />

// src/app/(app)/layout.tsx（RSC）—— 受保护路由拦截（边界 #6）
const session = await getCurrentSession();
if (!session) redirect(ROUTES.login);
```

### 契约总表

| 契约 | 调用方 | 被调方 | 错误情形 |
| ---- | ---- | ---- | ---- |
| `registerAction` | RegisterForm（client） | actions → service | INVALID_INPUT（zod 复验不过）/ PHONE_ALREADY_REGISTERED |
| `registerWithPhone` | registerAction | service → db 事务 | 23505 → PHONE_ALREADY_REGISTERED |
| `hashPassword` | service | better-auth/crypto | 无业务错误（scrypt） |
| `authClient.signIn.phoneNumber` | LoginForm（client） | POST /api/auth/sign-in/phone-number | 失败经 `mapSignInError` 统一为 R7 文案 |
| `authClient.signOut` | SignOutButton（client） | POST /api/auth/sign-out | 失败仍强制 `router.replace(ROUTES.login)` |
| `getCurrentSession` | (auth)/(app) 布局、workbench 页 | queries → lib/auth | 未登录 → null → 守卫动作 |
| `validateAccount` / `validatePassword` / `validateRegisterForm` | 两个表单组件 | validators（纯函数） | 返回 messageKey，不抛异常 |
| `auth.handler` | api/auth/[...all] | Better Auth 端点 | 邮箱端点被 hook 403；限流 429 |

**路由行为落点表**（proposal 路由行为表逐项，一行一条）：

| 路由行为 # | 实现位置（函数/守卫/组件） | 错误情形 |
| ---- | ---- | ---- |
| 1 | (app) 布局 RSC 守卫：`getCurrentSession` → null 时 `redirect(ROUTES.login)` | 未登录响应不携带受保护内容（边界 #6） |
| 2 | AuthScreen 登录成功 → `router.replace(ROUTES.workbench)`，链路不查档案表（D-03） | 登录失败经 `mapSignInError` 呈现于表单提示区（R7） |
| 3 | `registerAction` 成功 → `authClient.signIn.phoneNumber` 自动登录 → `router.replace(ROUTES.workbench)`（D-04） | 注册失败 fieldErrors（R8）/ PHONE_ALREADY_REGISTERED（R10） |
| 4 | SignOutButton → `authClient.signOut`（服务端删 Redis 键 + PG 行）→ `router.replace(ROUTES.login)` | signOut 失败仍强制 replace（契约总表） |
| 5 | (auth) 布局守卫已登录 → AuthRedirect：有历史 `router.back()` / 无历史 `replace(workbench)` | 阈值语义依赖浏览器历史槽位行为（Task 12 裁决：Chromium 验证，跨浏览器遗留记 Minor） |
| 6 | AuthScreen.switchView：表单值保留、errors 清空、`history.replaceState` 同步 URL | — |
| 7 | E-07 整条文案可点（复用 ViewSwitchLink 切换）→ 切 login 视图并带入手机号 | — |

## UI 与组件

1. **路由/页面**：`/login`、`/register` 路由页（RSC 薄壳）+ `/workbench` 工作台承接页（占位，AXY-12 替换；D-10 最小验收：路由存在、可渲染、未登录守卫生效、登录后可达）；视图切换为 AuthScreen 页内切换（顶部 tab + 底部链接），`history.replaceState` 同步 `/login` ↔ `/register`（路由行为 #6），刷新/直开/书签行为一致。

2. **组件树与既有组件复用关系**（组件均为 `modules/auth/components/` 模块私有新建、无跨模块复用；PasswordField 为登录框/注册框/确认密码框三处复用的同一实现）：

```
app/layout.tsx (RSC，挂 NextIntlClientProvider)
app/(auth)/layout.tsx (RSC 守卫，R12)
├─ 已登录 → AuthRedirect (client：有历史（history.length > 2，实现裁决——Chromium 历史槽位语义，见 tasks.md Task 12）→ router.back()；否则 router.replace(workbench))
└─ 未登录 → children
   ├─ login/page.tsx    → <AuthScreen initialView="login" />
   └─ register/page.tsx → <AuthScreen initialView="register" />

AuthScreen (client，模块私有) —— 视图切换器
├─ 状态（全部 useState，提升于此）：
│    activeView: 'login' | 'register'
│    表单值 { account, password, confirmPassword, agreementAccepted }  ← R16 切换保留
│    errors（切换视图时清空）← R16
│    submitting: boolean ← R5
├─ AuthTabs（顶部 tab，R16）
├─ LoginForm（受控）或 RegisterForm（受控）
│  ├─ AccountField（登录：手机号/邮箱）/ PhoneField（注册：maxLength=11，边界 #1）
│  ├─ PasswordField ×1~2（R17 显隐切换，登录/注册/确认密码三处复用）
│  ├─ AgreementCheckbox（R4；协议名纯文本、无链接（D-08），勾选真实落库，边界 #9）
│  ├─ FormSummary（R1 顶部汇总，按未通过项数计数，ICU 复数）
│  └─ SubmitButton（R5：登录中…/注册中…，submitting 时禁用）
└─ ViewSwitchLink（底部链接，R16；R10「去登录」复用此切换并带入手机号）

app/(app)/layout.tsx (RSC 守卫) 
app/(app)/workbench/page.tsx (RSC 占位：手机号 + SignOutButton；AXY-12 替换)
SignOutButton (client：authClient.signOut() → router.replace(ROUTES.login))
```

3. **表单与交互状态**——F 表逐条落点（单一来源 validators.ts，前端/后端双半边）：F-01 → `validateAccount`（PHONE_RE / EMAIL_RE）；F-02 → `validatePassword`（PASSWORD_RE，登录框/注册框/确认密码框三处共用；后端半边 zod PASSWORD_RE + `minPasswordLength/maxPasswordLength`）；F-03 → `validateRegisterForm` 手机号分支 + PhoneField `maxLength=11`（前端）+ user.phone_number 唯一索引（后端）；F-04 → `validateRegisterForm` 确认密码分支（与密码一致）；F-05 → AgreementCheckbox 必勾（前端）+ `registerInputSchema` 的 `z.literal(true)`（后端）。错误呈现位置映射见「错误与边界处理」表二：E-01～E-05 字段下方、E-06 表单提示区、E-07 注册表单提示区；协议勾选错误在勾选框旁、不进汇总计数（D-01）。交互状态归属：`submitting`（AuthScreen）驱动 SubmitButton 文案「登录中…/注册中…」与禁用（R5）；密码显隐为 PasswordField 局部态（R17）；表单值与 errors 提升于 AuthScreen（R16）。

4. **演示态 ↔ AC 映射**（proposal 14.1 清单，一行一态）：

| 演示态 | 对应 AC | 承载 |
| ---- | ---- | ---- |
| 1 登录 | AC-1、AC-6 | 登录视图 + 登录成功落工作台承接页（R4/R5/R6/R7） |
| 2 校验失败 | AC-2、AC-3、AC-5 | 字段级文案逐字 + FormSummary 计数（R1/R2/R3） |
| 3 登录中 | AC-1 | SubmitButton 加载态 + 成功/失败分支（R5/R6/R7） |
| 4 注册 | AC-4、AC-5 | RegisterForm 四字段 + 注册即登录（R3/R4/R8/R9/R10） |
| 重置（演示专态） | 无 AC | E2E 数据复位用，无产品行为 |

5. **守卫归属**：未登录拦截在 Server 层——(app) 布局 RSC `getCurrentSession` → `redirect(ROUTES.login)`，未登录响应不含受保护内容（边界 #6）；已登录访问 `/login`·`/register` 由 (auth) 布局 RSC 守卫承接 → AuthRedirect 双分支（有历史 back / 无历史 replace(workbench)，路由行为 #5）；(app) 页面读 cookie 为动态渲染，后退导航触发 RSC 重取；会话真相只在服务端（`getCurrentSession`），客户端不镜像。

**状态归属**：表单值、错误、loading 全部为客户端局部状态（轴 5 阶段 0：不入 zustand、无 TanStack Query 场景）；会话真相只在服务端（`getCurrentSession`），客户端不镜像。**URL 同步**：视图切换不导航，`history.replaceState` 同步 `/login` ↔ `/register`，刷新/直开/书签行为一致。**登录/注册成功跳转**一律 `router.replace(ROUTES.workbench)`，避免登录页残留历史（后退再触发 R12 守卫）。

**文案（ADR-0010 next-intl，无前缀策略，本特性落地最小设施）**：`next-intl@^4`（peerDeps 已覆盖 Next 16）、`next.config.ts` 接 `createNextIntlPlugin`、`src/i18n/request.ts`（固定返回 zh-CN：单语言阶段 cookie 协商是可证明的死代码——唯一支持语言 zh-CN 且全站无 NEXT_LOCALE 写入点；固定 locale 移除 requestLocale 读取，使根布局 getMessages() 恢复静态预渲染、消除全站空静态 shell；多语言时按 ADR-0010 终态将协商迁入 proxy）、`src/locales/zh-CN/auth.json`。键清单（E2E 断言以此渲染文案为准）：

| 键 | 文案 |
| ---- | ---- |
| auth.account.required | 请输入手机号或邮箱 |
| auth.account.invalid | 格式不对：手机号 11 位，或 name@mail.com |
| auth.password.required | 请输入密码 |
| auth.password.invalid | 密码为 8—20 位，需含字母与数字 |
| auth.register.phoneInvalid | 请输入 11 位有效手机号 |
| auth.register.passwordMismatch | 两次输入的密码不一致 |
| auth.agreement.required | 请阅读并勾选《用户协议》与《隐私政策》 |
| auth.error.invalidCredentials | 账号或密码不对 |
| auth.error.tooManyAttempts | 操作过于频繁，请稍后再试 |
| auth.error.phoneRegistered | 该手机号已注册，去登录 |
| auth.error.unknown | 出了点问题，请稍后再试 |
| auth.summary.errors | 有 \{count\} 项需要修改（ICU 复数） |
| auth.submit.loggingIn / auth.submit.registering | 登录中… / 注册中… |

**组件实现**：auth 表单为 `modules/auth/components/` 模块私有组件，Tailwind 4 手写对齐线框图低保真样式；不初始化 shadcn/ui（ADR-0004 约定的是 `components/ui/` 共享层，跨模块共享 UI 需求出现时再引入）。

## 错误与边界处理

| proposal 边界项 | 处理方式 | 落点 |
| ---- | ---- | ---- |
| B1 手机号合法域 | PHONE_RE 前端（validators）+ 后端（zod + `phoneNumberValidator`）双重校验；注册框 maxLength=11 | validators.ts / schema.ts / lib/auth.ts / PhoneField |
| B2 邮箱仅为登录输入形态 | `validateAccount` 判 kind='email'：客户端直接呈现 R7 统一文案、不发起请求；API 直连 `/sign-in/email`、`/sign-up/email` 被 hook 403；占位邮箱格式可登录但需正确密码，无存在性探测面 | validators.ts / mapSignInError / lib/auth.ts hooks |
| B3 密码规则三处一致 | PASSWORD_RE 单一来源，登录框/注册框/确认密码框共用 `validatePassword`；后端 zod + `minPasswordLength/maxPasswordLength` | validators.ts / schema.ts / PasswordField |
| B4 验证码字段隐藏 | 注册表单无该字段；`sendOTP` 为 no-op（OTP 码无处投递，端点不可被利用），字段恢复属后续迭代 | RegisterForm / lib/auth.ts |
| B5 会话与退出 | `storeSessionInDatabase: true` 双写；`signOut` 由 Better Auth 删 Redis 键 + PG 行；E2E 验证退出后直连/后退均被挡 | lib/auth.ts / SignOutButton |
| B6 服务端未登录拦截 | (app) 布局 RSC 守卫 `redirect(ROUTES.login)`，未登录响应不含受保护内容；(app) 页面因读 cookie 为动态渲染，后退导航触发 RSC 重取 | (app)/layout.tsx |
| B7 路由路径常量化 | ROUTES 唯一来源，守卫/表单/跳转全部引用 | lib/routes.ts |
| B8 并发注册仅一次成功 | user.phone_number 唯一索引 + 单事务；23505 映射为 PHONE_ALREADY_REGISTERED | service.ts |
| B9 协议占位但勾选真实 | 链接 `preventDefault` 不跳转；勾选状态经 registerAction 落库（R15） | AgreementCheckbox / service.ts |
| B10 工作台未实现 | (app)/workbench 占位页（标题 + 手机号 + 退出按钮），AXY-12 替换；R6/R9/R12 验收锚点为「到达 /workbench 且渲染占位标识」 | workbench/page.tsx |

**表二 · E 表映射**（呈现位置与实现一致性的核对锚点）：

| E 编号 | 产出函数/组件 | 呈现位置（字段下/表单提示区/勾选框旁） | 关联 R |
| ---- | ---- | ---- | ---- |
| E-01 | `validateAccount`（留空分支）→ AccountField + FormSummary | 字段下方 + 顶部汇总（计数，D-01） | R1 |
| E-02 | `validateAccount`（格式分支）→ AccountField | 字段下方；改填合法后消失 | R2 |
| E-03 | `validatePassword`（三处共用）→ PasswordField | 字段下方 | R3 |
| E-04 | `validateRegisterForm`（手机号分支）→ PhoneField | 字段下方 | R8 |
| E-05 | `validateRegisterForm`（确认密码分支）→ RegisterForm | 字段下方 | R8 |
| E-06 | `mapSignInError` → LoginForm 表单提示区（三情形统一，含 D-06 邮箱路径） | 表单提示区 | R7 |
| E-07 | `registerAction` PHONE_ALREADY_REGISTERED → RegisterForm 提示区（整条文案可点，路由行为 #7） | 注册表单提示区 | R10 |

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | ---- |
| R1 | LoginForm：`validateAccount` 留空 → 字段文案 + FormSummary 计数，表单不提交 | 组件单测（留空文案 + 「有 2 项需要修改」计数 + URL 不变）；E2E 同断言浏览器级 |
| R2 | `validateAccount`（PHONE_RE / EMAIL_RE）；改填合法后错误清除（受控状态） | validators 单测全分支（10 位/首位 2/号段外/含空格/abc@mail）；组件测试改填消失 |
| R3 | `validatePassword`（PASSWORD_RE），三处输入框共用 | validators 单测（`12345678`/21 位拒、`abcd1234` 过）；组件 + E2E 逐字 E-03 |
| R4 | AgreementCheckbox + 登录/注册两表单提交前校验勾选，未勾选不提交、勾选框错误态高亮 | 组件测试 aria-invalid + 不提交；E2E 勾选后解除 |
| R5 | AuthScreen.submitting → SubmitButton 文案与禁用 | 组件测试「登录中…/注册中…」+ disabled；E2E 拦截 sign-in 延迟 300ms 断言 |
| R6 | 登录成功 `router.replace(ROUTES.workbench)`；链路不查询任何档案表（PO 修订），已/未建档行为天然一致 | E2E 两独立账号注册→退出→登录全链路均落 /workbench 且 session-phone 一致 |
| R7 | `mapSignInError` 客户端统一 + API 层三情形（不存在/错密码/空密码直连 POST）同文案断言（已实测闭合，见开放问题 #1） | 集成 endpoints.test.ts：三情形状态码/code/message 集合长度 = 1 且无探测性字样；E2E 邮箱形态同文案 |
| R8 | RegisterForm 字段集（手机号/密码/确认密码/协议）+ `validateRegisterForm` 文案 | 单测/组件/E2E 三层逐字 E-04/E-05 + 表单不提交 |
| R9 | registerAction 成功 → `authClient.signIn.phoneNumber`（自动登录）→ workbench | 集成 service/actions 断言 user + credential account 行；E2E registerViaUI 落 /workbench |
| R10 | service 23505 → PHONE_ALREADY_REGISTERED → 文案含「去登录」链接 → AuthScreen 切换视图并带入手机号 | 集成同号再注册 user 恰 1 行；E2E 点击「去登录」切登录视图且账号框带入 |
| R11 | `authClient.signOut`（删 Redis+PG）+ (app) 守卫 + SignOutButton 跳登录页 | 集成：sign-out 后旧 cookie getSession 空 + Redis 键删 + PG 行删；E2E 直访/后退挡回 + 重登数据完好 |
| R12 | (auth) 布局守卫 → AuthRedirect（有历史 back / 无历史 replace(workbench)），不渲染表单 | 组件单测阈值分支；E2E 有历史/直开两分支落点 + 响应不含表单 |
| R13 | `hashPassword`（scrypt 摘要）+ service/action 全链路不记录入参 | 人工抽检：查库 3 条 password 均摘要非明文 + E2E 日志 grep 明文 0 处（自动化补测归测试提质裁定，C-05） |
| R14 | user.phone_number 唯一索引 + 事务 + 23505 映射 | 集成并发双注册恰一成功一 PHONE_ALREADY_REGISTERED；查库 pg_indexes 直证唯一索引存在 |
| R15 | 注册事务写入 agreement_version='v1' 与 agreed_at | 集成查库断言两字段 |
| R16 | AuthScreen 提升表单值状态、切换清错误、`history.replaceState` URL 同步 | 组件单测值保留 + 错误清空 + replaceState 调用；E2E URL/值/错误三断言 |
| R17 | PasswordField 显隐切换 | 组件测试三处输入框独立切换；E2E type 切换 + 值保留 |

## 测试接缝

| 测试层（单元/集成/E2E/人工抽检） | 接缝（函数/路由/接口） | 断言要点 | 关联 R |
| ---- | ---- | ---- | ---- |
| 单元 | validators.ts：PHONE_RE / EMAIL_RE / PASSWORD_RE / validateAccount / validatePassword / validateRegisterForm | F 表逐规则正负例（F-02 三处共用同一导出） | R1/R2/R3/R8 |
| 单元 | 组件测试：AuthScreen / FormSummary / PasswordField / AgreementCheckbox / SubmitButton / AuthRedirect | 逐字文案 + 汇总计数 + aria-invalid + 显隐 + 禁用 + 切换保值清错 + replaceState + 阈值分支 | R1/R2/R3/R4/R5/R11/R12/R16/R17 |
| 单元 | tests/lib：routes / redis / auth（PHONE_RE 源码同步守护）/ auth-client（方法名守护） | 常量与签名守护 | 边界 #7、开放问题 #2 |
| 集成 | POST /api/auth/sign-in/phone-number 直连三情形（不存在/错密码/空密码） | 状态码、code、message 集合长度 = 1，无探测性差异字样 | R7 |
| 集成 | /api/auth/sign-up/email、/sign-in/email 直连 | before-hook 403 | 非目标 #4、边界 #2 |
| 集成 | registerWithPhone 事务 + 23505 映射（含 Promise.allSettled 并发同号） | user/account 行字段、agreement 两字段、同号恰 1 行、并发恰一成功 | R9/R10/R14/R15 |
| 集成 | POST /api/auth/sign-out 后旧 cookie getSession + Redis 键 + PG 行 | 三处全失效 | R11、边界 #5 |
| 集成 | getCurrentSession（真实会话 + headers 注入） | 无 cookie → null；有效 cookie → AuthSession 形状 | R11/R12 前置 |
| E2E | /login ↔ /register 全流程（演示态 1–4 + 重置专态） | 逐字文案、守卫双分支、切换保值、提交中禁用、退出/直访/后退 | R1–R6/R8–R12/R16/R17、路由行为 #1–#7 |
| 人工抽检 | 查库 account.password（3 条）+ E2E 全量日志 grep 明文密码 | 摘要非明文（`^\S+:\S+$`）；日志 0 处 | R13 |

## 与 ADR 的关系

| 涉及技术 | ADR | 一致性 |
| ---- | ---- | ---- |
| Better Auth | [ADR-0013](../adr/better-auth) | 一致：drizzleAdapter、secondaryStorage、`auth.api.getSession` 服务端调用、客户端 SDK 驱动登录 UI；phoneNumber 插件属「按需启用」范围。注册走 service 插表是 ADR 未覆盖的实现层选择（依据插件文档对 credential 账号的要求），不构成偏离 |
| PostgreSQL + Drizzle | [ADR-0005](../adr/postgresql-pgvector) / [ADR-0006](../adr/drizzle-orm) | 一致；驱动选 postgres-js 属 ADR 未覆盖的实现细节 |
| Redis | [ADR-0007](../adr/redis) | 一致：ioredis ^5（`@better-auth/redis-storage` 的 peerDeps 即 ioredis）；仅存会话缓存/限流计数等可丢失数据 |
| 客户端数据层 | [ADR-0025](../adr/client-data-layer) | 一致：注册=表单突变→Server Action 判别联合；登录=ADR-0013 明示的 SDK 直调特例；本期无 TanStack Query 场景 |
| i18n | [ADR-0010](../adr/i18n) | 一致：本特性落地 next-intl 最小基础设施（无前缀策略）+ zh-CN/auth.json 文案集中 |
| UI 组件库 | [ADR-0004](../adr/shadcn-ui) | 不冲突：auth 组件为模块私有（Tailwind 4 手写），不初始化 `components/ui/`；共享 UI 需求出现时再按 ADR 引入 |
| Vitest / Playwright | [ADR-0012](../adr/vitest) / [ADR-0017](../adr/playwright-e2e) | 一致：validators 单测、service/端点集成测、全流程 E2E（见需求承载对照） |

**Q 条目不进设计范围**：Q1（接口 p95 ≤ 500ms）、Q2（`/login` 首屏可交互 ≤ 2s）不在终审与实现范围，由测试提质阶段验收（D-09：豁免机制废除，Q 条目验收后置）。

**新增依赖**：`better-auth@^1.7`（锁 minor，ADR-0013）、`@better-auth/redis-storage@^1.7`、`ioredis@^5`、`drizzle-orm@^1`、`postgres`、`next-intl@^4`；dev：`drizzle-kit`。

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---- | ---- |
| 1 | phoneNumber 插件 `/sign-in/phone-number` 对「用户不存在/密码错误」是否原生同文案；若有差异，兜底：登录改由 Server Action 包装 `auth.api.signInPhoneNumber` 统一返回 | 其余设计定稿与实现启动 | 已实测闭合（Task 6，2026-11-14）：原生一致，无需兜底——三情形（未注册+任意密码/已注册+错密码/已注册+空密码）均为 401 + `INVALID_PHONE_NUMBER_OR_PASSWORD`，状态码、code、message 完全一致（tests/integration/auth/endpoints.test.ts） |
| 2 | `authClient.signIn.phoneNumber` 的确切方法名以 `phoneNumberClient` 生成类型为准（契约锚点是端点 `POST /sign-in/phone-number`） | 数据模型、service、守卫等全部其余设计 | 已实测闭合（Task 4，2026-11-14）：方法名一致——`signInPhoneNumber` 端点经客户端 path-to-object 生成为 `signIn.phoneNumber`（tests/lib/auth-client.test.ts 常驻守护） |
| 3 | 工作台占位页形态（标题 + 手机号 + 退出按钮）由 AXY-12 正式设计替换 | 本特性验收（proposal 边界 #10 已确认占位承接） | 待定稿（AXY-12 承接） |

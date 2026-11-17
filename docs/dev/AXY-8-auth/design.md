---
title: 'Design: AXY-8 登录注册'
description: 登录注册的架构设计(数据模型/契约/UI/组件)
sidebar_position: 2
---

# Design: AXY-8 登录注册

| 对应 Proposal | [AXY-8 登录注册](../../product/AXY-8-auth/proposal) | 状态 | 已批准 |
| ---- | ---- | ---- | ---- |
| 日期 | 2026-11-16 | 批准人 | 海渝（2026-11-16，CR-20261116-1 修订重批） |
| 修订 | CR-20261116-1（2026-11-16）：凭据手机号→账户名+密码，按 [proposal v4](../../product/AXY-8-auth/proposal) 重写受影响节 | 原版 | 2026-11-14 已批准（手机号凭据版；实现基线 merge commit `baa88ea`，历史结论存 [tasks](./tasks) 裁决记录与 [review](./review) 墓碑） |

> 修订说明（CR-20261116-1）：本版为 B 级修订后的**唯一有效 design**。受影响节（架构总览/数据模型/契约/UI 与组件/错误与边界/需求承载/测试接缝/与 ADR 的关系/开放问题）按 proposal v4 重写为最终形态；旧开放问题 #1/#2（手机号端点实测闭合）随端点废止移除，证据存 tasks.md 裁决记录。变更管理依据见 [change-record](../../product/AXY-8-auth/change-record)。

## 架构总览

认证底座为 Better Auth 1.7（[ADR-0013](../adr/better-auth)）：drizzleAdapter 接自有 PG、**username 插件**提供账户名+密码登录端点（`/sign-in/username`）、`@better-auth/redis-storage`（ioredis）作 secondaryStorage，会话双写 PG + Redis。三个关键取舍：

1. **注册不走插件的注册路径**：better-auth 1.7.23 的 username 插件只有 `/sign-in/username` 与 `/is-username-available` 两个端点（无 `/sign-up/username`），插件生态的注册载体是核心端点 `/sign-up/email`——要求 `emailAndPassword.enabled` 且 email 通过 `z.email()` 校验（中文账户名直接死于 body schema，占位邮箱派生亦无法通过）。故注册仍由 `modules/auth/service.ts` 在单事务内直接插表（user + credential account），密码经 `better-auth/crypto` 的 `hashPassword`（与核心同参数 scrypt）。凭据记录满足登录端点的查询三条件 `userId ∧ providerId="credential" ∧ accountId=userId`（`internalAdapter.findCredentialAccount`），与 `/sign-in/username` 严格同构。
2. **登录/登出由客户端 SDK 直调**（ADR-0013「客户端登录 UI 由官方客户端 SDK 驱动」）；**注册是表单突变，走 Server Action 判别联合返回**（[ADR-0025](../adr/client-data-layer)）。两个 ADR 的边界在此互补而非冲突。
3. **user.email 为 Better Auth 核心必填列**，本产品无邮箱账号，存确定性占位邮箱 `${username}@user.styb.invalid`（`.invalid` 为 RFC 2606 保留 TLD，永不展示、不投递；自研事务 raw insert 不经 `z.email()` 与 email 查重，中文本地部分与大小写折叠仅是插件注册路径的坑，此处天然规避）——`/sign-up/email`、`/sign-in/email`、`/is-username-available` 三个端点经 before-hook 显式 403（边界 #2：无邮箱凭据形态；R7：不开放账户名存在性探测面）。

插件选项四要件（与 proposal F-01 逐项对齐）：`usernameValidator`（USERNAME_RE，默认正则拒中文，必须覆盖）、`minUsernameLength: 1` / `maxUsernameLength: 16`（默认 3/30）、`usernameNormalization: false`（**默认 toLowerCase，此为区分大小写的唯一关闭开关**，关闭后存储/登录查找/查重全部原样大小写）、`displayUsername: false`（产品无展示名概念，不加第二列）+ `immutableUsername: true`（账户名是登录凭据，产品负空间无改名语义，防已登录会话经 `/update-user` 直连改名）。

分层遵循[代码目录](../代码目录)：`src/lib/` 放底座（auth 实例、auth-client、redis、路由常量），`src/modules/auth/` 按三段式落业务，`src/app/(auth)`、`src/app/(app)` 为薄壳路由。会话策略：`storeSessionInDatabase: true`——Redis 为首要查询层、PG 兜底；退出登录时 Better Auth 同步删除 Redis 键与 PG 行（R11）。

**保留资产兼容性核对**（CR-20261116-1 §7 要求，逐项结论落对应节）：会话双写与守卫（R11/R12，见契约「路由层薄壳」与需求承载 R11/R12——配置块无凭据字段，守卫只判 session 真值）、协议落库（R15，registerWithUsername 事务内原样写入）、密码摘要（R13，hashPassword 与 scrypt 参数不变）、视图切换/显隐（R16/R17，AuthScreen 状态提升与 PasswordField 原样保留）、路由常量（ROUTES 零凭据耦合）、i18n 设施（next-intl 固定 zh-CN 设施不动，仅 auth.json 键值修订）。

实现阶段须先读 `node_modules/next/dist/docs/` 中 App Router 相关指南（AGENTS.md 约定：Next 16 与训练数据存在破坏性差异）。

## 范围与非目标对照

| proposal 非目标 # | 内容 | 本设计处置（不覆盖/不引入的概念） |
| ---- | ---- | ---- |
| 1 | 短信验证码的发送与校验 | 不覆盖：无 OTP 插件、无 sendOTP、无验证码字段（D-12 废止，无恢复场景）；verification 表保留空表但其唯一消费者已随 phoneNumber 插件移除（表去留归后续清理迁移，超出 CR §5 裁定范围不删） |
| 2 | 找回密码 | 不覆盖：无找回密码端点与入口组件（占位入口已随 D-08 删除） |
| 3 | 第三方登录（微信登录等） | 不覆盖：无 socialProviders 配置、无第三方登录按钮（已随 D-08 删除） |
| 4 | 邮箱注册与邮箱登录 | 不覆盖：不引入邮箱路径——`/sign-up/email`、`/sign-in/email` 经 before-hook 403；user.email 仅存占位邮箱，UI 永不展示；邮箱形态输入因 F-01 字符集（含 `.` 与 `@`）按 E-02 格式非法处理，无特例分支 |
| 5 | 《用户协议》《隐私政策》正文内容与法务审阅 | 不覆盖：协议名纯文本、无链接（D-08）；仅落库协议版本与同意时间（R15，仅注册表单勾选） |
| 6 | 2FA、魔术链接、组织等 Better Auth 插件能力 | 不引入：plugins 仅 username；ADR-0013 按需启用 |
| 7 | 「记住我」、多端会话管理界面 | 不覆盖：登录调用不带 rememberMe；无多端会话管理界面与路由 |
| 8 | 企业/高校账号对接 | 不覆盖：无对接代码与文案 |
| 9 | 新用户信息录入的引导与「跳过」交互 | 不覆盖：登录/注册成功一律 `router.replace` 工作台承接页，链路不查档案表、无信息录入路由（D-05） |

## 数据模型

**放置约定（沿用原版样板）**：drizzle 表定义在 `src/modules/auth/schema.ts`（模块属主，含 zod 推导）；`src/db/schema.ts` 为公共契约 barrel（`export * from '@/modules/auth/schema'`，依赖规则 5「人人可读、写入仅属主」）；`src/db/client.ts` 以 `{ schema, casing: 'snake_case' }` 构造单例。迁移由 drizzle-kit 生成至 `src/db/migrations`（[ADR-0006](../adr/drizzle-orm)）。

```
user 1 ── N account（credential 记录持密码摘要）
user 1 ── N session（Redis 缓存 + PG 双写）
verification 空表（OTP 消费者已随 phoneNumber 插件移除；结构保留，去留归后续清理迁移）
```

| 实体 | 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- | ---- |
| user | id | text | PK | `crypto.randomUUID()` |
| | name | text | NOT NULL | 注册时取账户名（占位展示名） |
| | email | text | NOT NULL UNIQUE | 占位邮箱 `usernameToPlaceholderEmail(username)`，UI 永不展示 |
| | email_verified | boolean | NOT NULL default false | |
| | image | text | nullable | 本期不用 |
| | username | text | NOT NULL，`user_username` 唯一索引 | **F-01/F-03/R14**；合法域 `^[一-龥A-Za-z0-9_]{1,16}$`，区分大小写（PG text 唯一索引默认大小写敏感）；索引显式命名 `user_username`（service 层 23505 判定依赖稳定名） |
| | agreement_version | text | NOT NULL | **R15**；当前 `'v1'`（协议正文为占位，非目标 #5） |
| | agreed_at | timestamptz | NOT NULL | **R15**；注册事务内写入 |
| | created_at / updated_at | timestamptz | NOT NULL default now() | |
| account | id | text | PK | uuid |
| | account_id | text | NOT NULL | credential 场景下 = user.id（登录端点查询三条件之一） |
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
| verification | id | text | PK | 结构保留（本迁移不涉及）；identifier/value/expires_at 均 NOT NULL |
| | identifier / value | text | NOT NULL | 空表：OTP 通道随手机号凭据废止（非目标 #1） |

**迁移归属**（CR-20261116-1 §5 裁定：**新增迁移，不改旧迁移** `20261114052112_perpetual_songbird`；纪律依据：feature-supersede SKILL「部分回滚改造」行 + ADR-0006「迁移纳入版本库评审」）：

```sql
ALTER TABLE "user" ADD COLUMN "username" text NOT NULL;
CREATE UNIQUE INDEX "user_username" ON "user" ("username");
ALTER TABLE "user" DROP COLUMN "phone_number";          -- 唯一索引 user_phone_number 随列删除
ALTER TABLE "user" DROP COLUMN "phone_number_verified";
```

> 空表假设（开放问题 #4）：按 0.1.0 无生产部署，迁移按空表形态生成；若执行环境存在存量行，`ADD COLUMN ... NOT NULL` 会失败——先人工处置（清库或回填，回填策略若需产品化回流 proposal 追认）。

schema.ts 内的 zod 推导（服务端入参校验，边界 #1 双重校验的后端半边）：

```ts
export const registerInputSchema = z
  .object({
    username: z.string().regex(USERNAME_RE),
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

### 环境变量（.env.example，不变）

```
BETTER_AUTH_SECRET=          # ≥32 字符随机串
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://studybuddy:***@localhost:5432/studybuddy
REDIS_URL=redis://localhost:6379
```

### src/lib/redis.ts（不变）

```ts
import Redis from 'ioredis';
/** 单例；REDIS_URL 连接；仅存可丢失数据（ADR-0007 纪律） */
export const redis: Redis;
```

### src/lib/auth.ts（Better Auth 实例，服务端 only）

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { redisStorage } from '@better-auth/redis-storage';
import { APIError, createAuthMiddleware } from 'better-auth/api';

/** 与 modules/auth/validators 的 USERNAME_RE 保持一致（同步性由单元测试守护） */
const USERNAME_RE = /^[一-龥A-Za-z0-9_]{1,16}$/;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // drizzle-orm 1.0 RC 移除 client 构造 schema 选项，适配器 fullSchema 回退
    // 不再可用，故在此显式传入表映射（原 Task 4 裁决，继续有效）
    schema: { user, account, session, verification },
  }),
  secondaryStorage: redisStorage({ client: redis, keyPrefix: 'better-auth:' }),
  session: { storeSessionInDatabase: true, expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  // enabled 无可达端点（两个 email 端点被下方 hook 403，注册唯一路径是
  // registerAction）；块本身保留——min/maxPasswordLength 8/20 经
  // context.password.config 约束登录路径密码长度上限（assertPasswordNotTooLong）
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 20 },
  plugins: [
    username({
      usernameValidator: (username: string) => USERNAME_RE.test(username), // 默认正则拒中文，必须覆盖
      minUsernameLength: 1,        // 插件默认 3
      maxUsernameLength: 16,       // 插件默认 30
      usernameNormalization: false, // 默认 toLowerCase；关闭后存储/查找/查重原样大小写（F-01/R14）
      displayUsername: false,       // 产品无展示名概念，不加第二列
      immutableUsername: true,      // 账户名为登录凭据、产品负空间无改名语义，防 /update-user 直连改名
    }),
  ],
  // 选项级 hooks.before 在 Better Auth 1.7 为单个 AuthMiddleware，先于插件
  // hooks 且 matcher 恒真——插件 hooks 仅挂 /sign-up/email 与 /update-user：
  // 前者本就被 403、后者经 immutableUsername 拒绝，无冲突（原 Task 4 裁决形态继续有效）
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 边界 #2 / 非目标 #4：本期无邮箱凭据形态。占位邮箱不得凭据化
      // （/sign-in/email），注册唯一路径是 registerAction（/sign-up/email）；
      // /is-username-available 无 UI 消费者，直连构成账户名枚举面（R7 不可探测纪律）
      if (
        ctx.path === '/sign-up/email' ||
        ctx.path === '/sign-in/email' ||
        ctx.path === '/is-username-available'
      ) {
        throw new APIError('FORBIDDEN', { message: 'Disabled endpoint' });
      }
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  // Better Auth 1.7 运行时 schema 校验对 registerWithUsername 直写的
  // agreementVersion/agreedAt 列（R15）误报 SchemaMismatchError，
  // 而本设计无自身可达的 user 插入路径，故关闭（原 Task 6 裁决继续有效）
  advanced: { database: { validateSchema: false } },
});
```

限流保持默认开启：内置 specialRule 按 `/sign-in` 前缀 3 次/10 秒，`/sign-in/username` 命中同款规则，防凭证填充（原 Task 12 裁决语义等价延续）。

> 实现裁决（hooks.before 形态、validateSchema 关闭、drizzleAdapter schema 显式映射、trustedOrigins 兜底）见 tasks.md 裁决记录 Task 4 / Task 6（原版裁决，修订版沿用；修订期新裁决按纪律记入实现计划）。

### src/lib/auth-client.ts（客户端 SDK）

```ts
import { createAuthClient } from 'better-auth/client';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [usernameClient({ displayUsername: false })], // 须与 server 端一致
});
// authClient.signIn.username({ username, password, rememberMe?: true })
//   : Promise<{ data?: { user; session }; error?: { code: string; message: string; status: number } }>
// authClient.signOut(): Promise<{ data?; error? }>
```

### src/lib/routes.ts（边界 #7：路由常量唯一来源，不变）

```ts
export const ROUTES = { login: '/login', register: '/register', workbench: '/workbench' } as const;
export type Routes = typeof ROUTES;
```

### modules/auth/validators.ts（纯函数，零 IO，单元测试锚点）

```ts
export const USERNAME_RE = /^[一-龥A-Za-z0-9_]{1,16}$/;          // F-01/F-03（区分大小写；输入不过滤）
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;   // R3（不变）

export type AccountCheck =
  | { ok: true }
  | { ok: false; messageKey: 'auth.account.required' | 'auth.account.invalid' };

export function validateAccount(raw: string): AccountCheck;                    // R1/R2（登录与注册同规则）
export function validatePassword(
  raw: string,
): { ok: true } | { ok: false; messageKey: 'auth.password.required' | 'auth.password.invalid' }; // R3

export type RegisterFormErrors = Partial<{
  username: 'auth.account.invalid';                                             // E-02（与登录共用）
  password: 'auth.password.required' | 'auth.password.invalid';
  confirmPassword: 'auth.register.passwordMismatch';
  agreement: 'auth.agreement.required';
}>;
export function validateRegisterForm(v: {
  username: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
}): RegisterFormErrors | null;                                                // R8
```

旧 `PHONE_RE` / `EMAIL_RE` / `AccountKind` 删除——账户名单一规则后无形态分支（邮箱形态输入不过 F-01 字符集，按 E-02 处理，无特例）。

### modules/auth/service.ts（写路径，注册事务）

```ts
import { hashPassword } from 'better-auth/crypto';

export const AGREEMENT_VERSION = 'v1' as const;
export function usernameToPlaceholderEmail(username: string): string; // `${username}@user.styb.invalid`

export type RegisterOutcome =
  | { ok: true; userId: string }
  | { ok: false; error: 'USERNAME_ALREADY_REGISTERED' };

/** 单事务：校验由调用方完成；插入 user（username/name/agreement_version/agreed_at/占位邮箱）+ credential account（R9/R13/R15）*/
export async function registerWithUsername(input: { username: string; password: string }): Promise<RegisterOutcome>;
// 错误情形：PG 23505 且约束为 user_username 唯一索引 → USERNAME_ALREADY_REGISTERED（R10/R14）
// （实测注记：user_email_key 表级约束先于该索引抛出，实现按双约束映射，语义等价——见 tasks.md 裁决记录 CR-20261116-1 节）
// 纪律：本函数与调用链不记录任何入参（R13 日志无明文密码）
```

`user.name` 取账户名；credential account 写法不变（`providerId: 'credential'`、`accountId: userId`、`password: await hashPassword(...)`）。

### modules/auth/queries.ts（读路径，RSC 调用）

```ts
export type AuthSession = {
  user: { id: string; name: string; username: string };
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
  | { ok: false; error: 'USERNAME_ALREADY_REGISTERED' };

/** registerInputSchema 复验（边界 #1 后端校验）→ registerWithUsername */
export async function registerAction(input: RegisterInput): Promise<RegisterActionResult>;
```

### modules/auth/errors.ts（R7 客户端统一文案映射，client-safe）

```ts
export type SignInErrorKey =
  | 'auth.error.invalidCredentials'
  | 'auth.error.tooManyAttempts'
  | 'auth.error.unknown';

/** 任一登录失败（用户不存在/密码错误/绕过前端校验的非法输入）→ invalidCredentials；429 → tooManyAttempts。
 *  映射不看 code（凭据无关，逻辑不变）；/sign-in/username 的原生错误码为
 *  INVALID_USERNAME_OR_PASSWORD（401）与 USERNAME_TOO_SHORT / USERNAME_TOO_LONG /
 *  INVALID_USERNAME（400），全部落入 invalidCredentials 分支 */
export function mapSignInError(err: { status?: number; code?: string } | null | undefined): SignInErrorKey;
```

### 路由层薄壳

```ts
// src/app/api/auth/[...all]/route.ts —— Better Auth 全部端点（含 /sign-in/username、/sign-out；
// /sign-up/email、/sign-in/email、/is-username-available 被 hook 403）
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
| `registerAction` | RegisterForm（client） | actions → service | INVALID_INPUT（zod 复验不过）/ USERNAME_ALREADY_REGISTERED |
| `registerWithUsername` | registerAction | service → db 事务 | 23505（user_username）→ USERNAME_ALREADY_REGISTERED |
| `hashPassword` | service | better-auth/crypto | 无业务错误（scrypt） |
| `authClient.signIn.username` | LoginForm（client） | POST /api/auth/sign-in/username | 失败经 `mapSignInError` 统一为 R7 文案；限流 429 → tooManyAttempts |
| `authClient.signOut` | SignOutButton（client） | POST /api/auth/sign-out | 失败仍强制 `router.replace(ROUTES.login)` |
| `getCurrentSession` | (auth)/(app) 布局、workbench 页 | queries → lib/auth | 未登录 → null → 守卫动作 |
| `validateAccount` / `validatePassword` / `validateRegisterForm` | 两个表单组件 | validators（纯函数） | 返回 messageKey，不抛异常 |
| `auth.handler` | api/auth/[...all] | Better Auth 端点 | 邮箱端点与 /is-username-available 被 hook 403；限流 429 |

**路由行为落点表**（proposal 路由行为表逐项，一行一条）：

| 路由行为 # | 实现位置（函数/守卫/组件） | 错误情形 |
| ---- | ---- | ---- |
| 1 | (app) 布局 RSC 守卫：`getCurrentSession` → null 时 `redirect(ROUTES.login)` | 未登录响应不携带受保护内容（边界 #6） |
| 2 | AuthScreen 登录成功 → `router.replace(ROUTES.workbench)`，链路不查档案表（D-03） | 登录失败经 `mapSignInError` 呈现于表单提示区（R7） |
| 3 | `registerAction` 成功 → `authClient.signIn.username` 自动登录 → `router.replace(ROUTES.workbench)`（D-04） | 注册失败 fieldErrors（R8）/ USERNAME_ALREADY_REGISTERED（R10） |
| 4 | SignOutButton → `authClient.signOut`（服务端删 Redis 键 + PG 行）→ `router.replace(ROUTES.login)` | signOut 失败仍强制 replace（契约总表） |
| 5 | (auth) 布局守卫已登录 → AuthRedirect：有历史 `router.back()` / 无历史 `replace(workbench)` | 阈值语义依赖浏览器历史槽位行为（原 Task 12 裁决：Chromium 验证，跨浏览器遗留记 Minor） |
| 6 | AuthScreen.switchView：表单值保留、errors 清空、`history.replaceState` 同步 URL | — |
| 7 | E-07 整条文案可点（复用 ViewSwitchLink 切换）→ 切 login 视图并带入账户名 | — |

## UI 与组件

1. **路由/页面**：`/login`、`/register` 路由页（RSC 薄壳）+ `/workbench` 工作台承接页（占位，AXY-12 替换；D-10 最小验收：路由存在、可渲染、未登录守卫生效、登录后可达）；视图切换为 AuthScreen 页内切换（顶部 tab + 底部链接），`history.replaceState` 同步 `/login` ↔ `/register`（路由行为 #6），刷新/直开/书签行为一致。

2. **组件树与既有组件复用关系**（组件均为 `modules/auth/components/` 模块私有、无跨模块复用；PasswordField 为登录框/注册框/确认密码框三处复用的同一实现；**PhoneField 删除**，账户名输入统一为 AccountField 单一实现；**登录表单无协议勾选行**，AgreementCheckbox 仅挂 RegisterForm）：

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
├─ LoginForm（受控）
│  ├─ AccountField（账户名，无 maxLength / 无字符过滤，D-12）
│  ├─ PasswordField ×1（R17 显隐切换）
│  ├─ FormSummary（R1 顶部汇总，按未通过项数计数，ICU 复数）
│  └─ SubmitButton（R5：登录中…，submitting 时禁用）
│  （D-13：登录表单无协议勾选行、无对应 props）
└─ RegisterForm（受控）
   ├─ AccountField（账户名，同上，与登录共用同一实现）
   ├─ PasswordField ×2（注册 + 确认密码，R17）
   ├─ AgreementCheckbox（R4/F-05；协议名纯文本、无链接（D-08），勾选真实落库，边界 #9）
   ├─ FormSummary（R8 汇总，协议错误不进计数，D-01）
   └─ SubmitButton（R5：注册中…）+ ViewSwitchLink（底部链接，R16；R10「去登录」复用此切换并带入账户名）

app/(app)/layout.tsx (RSC 守卫)
app/(app)/workbench/page.tsx (RSC 占位：账户名 + SignOutButton，data-testid="session-account"；AXY-12 替换)
SignOutButton (client：authClient.signOut() → router.replace(ROUTES.login))
```

3. **表单与交互状态**——F 表逐条落点（单一来源 validators.ts，前端/后端双半边）：F-01 → `validateAccount`（USERNAME_RE；前端组件无 maxLength、无字符过滤，提交时校验）+ 后端半边 `/sign-in/username` 插件 `usernameValidator` + `min/maxUsernameLength`；F-02 → `validatePassword`（PASSWORD_RE，三处共用；后端半边 zod PASSWORD_RE + `minPasswordLength/maxPasswordLength` 8/20 与登录路径 `assertPasswordNotTooLong`）；F-03 → `validateRegisterForm` 账户名分支（与 F-01 同一正则与文案）+ `registerInputSchema` username 正则 + `user_username` 唯一索引（后端）；F-04 → `validateRegisterForm` 确认密码分支（与密码一致）；F-05 → AgreementCheckbox 必勾（前端，仅注册表单）+ `registerInputSchema` 的 `z.literal(true)`（后端）。错误呈现位置映射见「错误与边界处理」表二：E-01～E-03 / E-05 字段下方、E-06 表单提示区、E-07 注册表单提示区；协议勾选错误在勾选框旁、不进汇总计数（D-01）。交互状态归属：`submitting`（AuthScreen）驱动 SubmitButton 文案与禁用（R5）；密码显隐为 PasswordField 局部态（R17）；表单值与 errors 提升于 AuthScreen（R16）。

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

**文案（ADR-0010 next-intl，设施不变，`src/locales/zh-CN/auth.json` 键值修订）**。键清单（13 个叶子键；E2E 断言以此渲染文案为准；废弃键 `register.phoneInvalid`、`error.phoneRegistered` 随 E-04 / E-07 修订删除）：

| 键 | 文案 |
| ---- | ---- |
| auth.account.required | 请输入账户名 |
| auth.account.invalid | 格式不对：1—16 位中文、字母、数字或下划线 |
| auth.password.required | 请输入密码 |
| auth.password.invalid | 密码为 8—20 位，需含字母与数字 |
| auth.register.passwordMismatch | 两次输入的密码不一致 |
| auth.agreement.required | 请阅读并勾选《用户协议》与《隐私政策》 |
| auth.error.invalidCredentials | 用户名或密码不匹配 |
| auth.error.tooManyAttempts | 操作过于频繁，请稍后再试 |
| auth.error.usernameRegistered | 该账户已注册，去登录 |
| auth.error.unknown | 出了点问题，请稍后再试 |
| auth.summary.errors | 有 \{count\} 项需要修改（ICU 复数） |
| auth.submit.loggingIn / auth.submit.registering | 登录中… / 注册中… |

**组件实现**：auth 表单为 `modules/auth/components/` 模块私有组件，Tailwind 4 手写对齐线框图低保真样式；不初始化 shadcn/ui（ADR-0004 约定的是 `components/ui/` 共享层，跨模块共享 UI 需求出现时再引入）。

## 错误与边界处理

**表一 · proposal 边界表对应**

| proposal 边界项 | 处理方式 | 落点 |
| ---- | ---- | ---- |
| B1 账户名合法域与输入上限（F-01/F-03，不过滤） | USERNAME_RE 前端（validators）+ 后端（zod + 插件 usernameValidator/min/max/normalization:false）双层校验；输入框无 maxLength、无字符过滤（提交时校验，D-12） | validators.ts / schema.ts / lib/auth.ts / AccountField |
| B2 无邮箱凭据形态（D-12） | 邮箱形态不过 F-01 字符集 → E-02（无特例短路分支）；`/sign-up/email`、`/sign-in/email` 经 hook 403（占位邮箱不得凭据化）；占位邮箱格式与 UI 永不暴露 | validators.ts / mapSignInError / lib/auth.ts hooks |
| B3 密码规则三处一致 | PASSWORD_RE 单一来源，三处共用 `validatePassword`；后端 zod + `minPasswordLength/maxPasswordLength`（登录路径 `assertPasswordNotTooLong`） | validators.ts / schema.ts / PasswordField |
| B4 无验证码字段（D-12 废止） | 注册表单无该字段；无 OTP 插件、无 sendOTP；verification 表无消费者（保留空表） | RegisterForm / lib/auth.ts |
| B5 会话与退出 | `storeSessionInDatabase: true` 双写；`signOut` 由 Better Auth 删 Redis 键 + PG 行；E2E 验证退出后直连/后退均被挡 | lib/auth.ts / SignOutButton |
| B6 服务端未登录拦截 | (app) 布局 RSC 守卫 `redirect(ROUTES.login)`，未登录响应不含受保护内容；(app) 页面因读 cookie 为动态渲染，后退导航触发 RSC 重取 | (app)/layout.tsx |
| B7 路由路径常量化 | ROUTES 唯一来源，守卫/表单/跳转全部引用 | lib/routes.ts |
| B8 并发注册仅一次成功 | `user_username` 唯一索引（区分大小写）+ 单事务；23505 映射为 USERNAME_ALREADY_REGISTERED | service.ts |
| B9 协议纯文本但勾选真实（仅注册） | 无链接（D-08）；勾选状态经 registerAction 落库（R15）；登录表单无协议行（D-13） | AgreementCheckbox / service.ts |
| B10 工作台未实现 | (app)/workbench 占位页（标题 + 账户名 + 退出按钮），AXY-12 替换；R6/R9/R12 验收锚点为「到达 /workbench 且渲染占位标识」 | workbench/page.tsx |

**表二 · E 表映射**（呈现位置与实现一致性的核对锚点）：

| E 编号 | 产出函数/组件 | 呈现位置（字段下/表单提示区/勾选框旁） | 关联 R |
| ---- | ---- | ---- | ---- |
| E-01 | `validateAccount`（留空分支）→ AccountField + FormSummary | 字段下方 + 顶部汇总（计数，D-01） | R1 |
| E-02 | `validateAccount`（格式分支，登录与注册共用）→ AccountField | 字段下方；改填合法后消失 | R2、R8 |
| E-03 | `validatePassword`（三处共用）→ PasswordField | 字段下方 | R3 |
| E-04 | **已废止（CR-20261116-1）**：原注册·手机号非法文案，R8 改引 E-02，无产出点 | — | — |
| E-05 | `validateRegisterForm`（确认密码分支）→ RegisterForm | 字段下方 | R8 |
| E-06 | `mapSignInError` → LoginForm 表单提示区（`/sign-in/username` 全部失败情形统一） | 表单提示区 | R7 |
| E-07 | `registerAction` USERNAME_ALREADY_REGISTERED → RegisterForm 提示区（整条文案可点，路由行为 #7） | 注册表单提示区 | R10 |

## 需求承载对照

| R | 承载 | 可测接缝 |
| - | ---- | ---- |
| R1 | LoginForm：`validateAccount` 留空 → 字段文案 + FormSummary 计数，表单不提交（登录表单无协议行） | 组件单测（留空文案「请输入账户名」+ 「有 N 项需要修改」计数 + URL 不变）；E2E 同断言浏览器级 |
| R2 | `validateAccount`（USERNAME_RE 单一规则）；改填合法后错误清除（受控状态） | validators 单测全分支（含空格「zhang san!」/17 位/中文/下划线/混合合法形态）；组件测试改填消失；E2E「zhang san!」与 17 位两形态 |
| R3 | `validatePassword`（PASSWORD_RE），三处输入框共用 | validators 单测（`12345678`/21 位拒、`abcd1234` 过）；组件 + E2E 逐字 E-03 |
| R4 | AgreementCheckbox 仅挂 RegisterForm（D-13）：登录表单无协议行；注册未勾选不提交、勾选框错误态高亮 | 组件测试：登录表单无协议行断言（新增）+ 注册 aria-invalid + 不提交；E2E 注册侧勾选后解除 |
| R5 | AuthScreen.submitting → SubmitButton 文案与禁用 | 组件测试「登录中…/注册中…」+ disabled；E2E 拦截 sign-in/username 延迟断言 |
| R6 | 登录成功 `router.replace(ROUTES.workbench)`；链路不查询任何档案表（D-03），已/未建档行为天然一致 | E2E 两独立账号注册→退出→登录全链路均落 /workbench 且 session-account 一致 |
| R7 | `mapSignInError` 客户端统一 + API 层三情形（不存在/错密码/绕过前端校验的空密码直连 POST /sign-in/username）同文案（前提见开放问题 #1） | 集成 endpoints.test.ts：三情形状态码/code/message 集合长度 = 1 且无探测性字样；E2E 非法形态同文案 |
| R8 | RegisterForm 字段集（账户名/密码/确认密码/协议，无验证码）+ `validateRegisterForm` 文案（账户名分支引 E-02） | 单测/组件/E2E 三层逐字 E-02/E-05 + 表单不提交 |
| R9 | registerAction 成功 → `authClient.signIn.username`（自动登录）→ workbench；`user.name`/`username` 落账户名 | 集成 service/actions 断言 user（username/agreement 两字段）+ credential account 行；E2E registerViaUI 落 /workbench |
| R10 | service 23505（user_username）→ USERNAME_ALREADY_REGISTERED → 文案含「去登录」→ AuthScreen 切换视图并带入账户名 | 集成同名再注册 user 恰 1 行；E2E 点击「去登录」切登录视图且账户框带入 |
| R11 | `authClient.signOut`（删 Redis+PG）+ (app) 守卫 + SignOutButton 跳登录页（凭据无关，原样保留） | 集成：sign-out 后旧 cookie getSession 空 + Redis 键删 + PG 行删；E2E 直访/后退挡回 + 重登数据完好 |
| R12 | (auth) 布局守卫 → AuthRedirect（有历史 back / 无历史 replace(workbench)），不渲染表单（凭据无关，原样保留） | 组件单测阈值分支；E2E 有历史/直开两分支落点 + 响应不含表单 |
| R13 | `hashPassword`（scrypt 摘要）+ service/action 全链路不记录入参（宿主函数改名，逻辑不变） | 人工抽检：查库 3 条 password 均摘要非明文 + E2E 日志 grep 明文 0 处（自动化补测归测试提质裁定，C-05） |
| R14 | `user_username` 唯一索引（PG text 默认区分大小写）+ 事务 + 23505 映射 | 集成并发双注册（同名含大小写变体）恰一成功一 USERNAME_ALREADY_REGISTERED；查库 pg_indexes 直证唯一索引存在 |
| R15 | 注册事务写入 agreement_version='v1' 与 agreed_at（registerWithUsername 内逻辑不变） | 集成查库断言两字段 |
| R16 | AuthScreen 提升表单值状态、切换清错误、`history.replaceState` URL 同步（原样保留） | 组件单测值保留 + 错误清空 + replaceState 调用；E2E URL/值/错误三断言 |
| R17 | PasswordField 显隐切换（原样保留） | 组件测试三处输入框独立切换；E2E type 切换 + 值保留 |

## 测试接缝

| 测试层（单元/集成/E2E/人工抽检） | 接缝（函数/路由/接口） | 断言要点 | 关联 R |
| ---- | ---- | ---- | ---- |
| 单元 | validators.ts：USERNAME_RE / PASSWORD_RE / validateAccount / validateRegisterForm | F 表逐规则正负例（含空格/非法字符/17 位/中文/下划线/混合合法；无 kind 分类） | R1/R2/R3/R8 |
| 单元 | 组件测试：AuthScreen / FormSummary / PasswordField / AgreementCheckbox / SubmitButton / AuthRedirect | 逐字文案 + 汇总计数 + aria-invalid（仅注册）+ 登录表单无协议行 + 显隐 + 禁用 + 切换保值清错 + replaceState + 阈值分支 | R1/R2/R3/R4/R5/R11/R12/R16/R17 |
| 单元 | tests/lib：routes / redis / auth（USERNAME_RE 源码同步守护）/ auth-client（`signIn.username` 方法名守护） | 常量与签名守护 | 边界 #7、开放问题 #2 |
| 集成 | POST /api/auth/sign-in/username 直连三情形（不存在/错密码/空密码） | 状态码、code、message 集合长度 = 1，无探测性差异字样 | R7 |
| 集成 | /api/auth/sign-up/email、/sign-in/email、/is-username-available 直连 | before-hook 403 | 非目标 #4、边界 #2 |
| 集成 | registerWithUsername 事务 + 23505 映射（含 Promise.allSettled 并发同名） | user 行字段（username/name/agreement 两字段/占位邮箱）、account credential 行、同名恰 1 行、并发恰一成功 | R9/R10/R14/R15 |
| 集成 | schema 断言：username 列 NOT NULL + `user_username` 唯一索引（pg_indexes 直证） | 索引存在与列约束 | R14、边界 #8 |
| 集成 | POST /api/auth/sign-out 后旧 cookie getSession + Redis 键 + PG 行 | 三处全失效 | R11、边界 #5 |
| 集成 | getCurrentSession（真实会话 + headers 注入） | 无 cookie → null；有效 cookie → AuthSession 形状（user.username） | R11/R12 前置 |
| E2E | /login ↔ /register 全流程（演示态 1–4 + 重置专态） | 逐字文案、守卫双分支、切换保值、提交中禁用、退出/直访/后退 | R1–R6/R8–R12/R16/R17、路由行为 #1–#7 |
| 人工抽检 | 查库 account.password（3 条）+ E2E 全量日志 grep 明文密码 | 摘要非明文（`^\S+:\S+$`）；日志 0 处 | R13 |

## 与 ADR 的关系

| 涉及技术 | ADR | 一致性 |
| ---- | ---- | ---- |
| Better Auth | [ADR-0013](../adr/better-auth) | 一致：drizzleAdapter、secondaryStorage、`auth.api.getSession` 服务端调用、客户端 SDK 驱动登录 UI。username 插件属 L31「按插件按需启用」范围（与原版 phoneNumber 插件同一归类先例）；凭据形态本身（账户名+密码）为产品决策，已经 CR-20261116-1 在 proposal v4 D-12 批准，不属设计层新选型。注：ADR-0013 背景描述为「邮箱密码 + 主流 OAuth 起步」，账户名+密码凭据形态与其背景陈述存在差异（背景非决策；本形态更贴近其密码凭据原假设）。注册走 service 插表是 ADR 未覆盖的实现层选择（依据 1.7.23 无 `/sign-up/username` 端点的插件事实与凭据三条件同构），不构成偏离 |
| PostgreSQL + Drizzle | [ADR-0005](../adr/postgresql-pgvector) / [ADR-0006](../adr/drizzle-orm) | 一致；新增迁移承载列变更（CR §5），不改旧迁移（feature-supersede 纪律 + ADR-0006「迁移纳入版本库评审」） |
| Redis | [ADR-0007](../adr/redis) | 一致：ioredis ^5（`@better-auth/redis-storage` 的 peerDeps 即 ioredis）；仅存会话缓存/限流计数等可丢失数据 |
| 客户端数据层 | [ADR-0025](../adr/client-data-layer) | 一致：注册=表单突变→Server Action 判别联合；登录=ADR-0013 明示的 SDK 直调特例；本期无 TanStack Query 场景 |
| i18n | [ADR-0010](../adr/i18n) | 一致：设施不变（固定 zh-CN + auth.json 命名空间），键值随 E 表修订 |
| UI 组件库 | [ADR-0004](../adr/shadcn-ui) | 不冲突：auth 组件为模块私有（Tailwind 4 手写），不初始化 `components/ui/` |
| Vitest / Playwright | [ADR-0012](../adr/vitest) / [ADR-0017](../adr/playwright-e2e) | 一致：validators 单测、service/端点集成测、全流程 E2E（见需求承载对照与测试接缝） |

**Q 条目不进设计范围**：Q1（接口 p95 ≤ 500ms）、Q2（`/login` 首屏可交互 ≤ 2s）不在终审与实现范围，由测试提质阶段验收（D-09）。

**依赖变化（CR-20261116-1）**：无新增依赖——`better-auth@^1.7`（1.7.23）的 username 插件为包内能力；phoneNumber 插件同包，无需 package.json 变更。

## 开放问题

| # | 问题 | 不阻塞什么 | 处置 |
| - | ---- | ---- | ---- |
| 1 | `/sign-in/username` 对「用户不存在/密码错误/空密码」是否原生同文案（401 + INVALID_USERNAME_OR_PASSWORD）——R7 统一文案的实现前提 | 数据模型、守卫等其余设计定稿与实现启动 | 已实测闭合（T7，2026-11-16）：三情形原生统一 401 + `INVALID_USERNAME_OR_PASSWORD`（better-auth index.mjs:157/172/186，含时序安全假哈希），无探测性差异字样；集成 endpoints.test.ts 集合长度=1 常驻断言，无需兜底包装 |
| 2 | `authClient.signIn.username` 的确切方法名以 `usernameClient` 生成类型为准（契约锚点是端点 `POST /sign-in/username`） | 数据模型、service、守卫等全部其余设计 | 已实测闭合（T4，2026-11-16）：`signIn.username({ username, password, rememberMe?, callbackURL? })` 成立——usernameClient 类型化签名 type-check 0 错 + 运行时 typeof 双证（客户端 Proxy 语义弱性见 tasks.md 裁决记录）；tests/lib/auth-client.test.ts 常驻守护 |
| 3 | 工作台占位页形态（标题 + 账户名 + 退出按钮）由 AXY-12 正式设计替换 | 本特性验收（proposal 边界 #10 已确认占位承接） | 待定稿（AXY-12 承接） |
| 4 | 存量数据与新增迁移的兼容：`ADD COLUMN username text NOT NULL` 在含存量行的库上失败。**声明假设**：0.1.0 无生产部署，迁移按空表形态生成；若执行环境存在存量行，迁移前人工处置（清库，或回填 `username = 原手机号串`——11 位数字恰好满足 F-01；回填策略若需产品化，回流 proposal 追认）。影响范围：迁移任务执行前置检查；不阻塞实现与集成测试（globalSetup 测试库按迁移链生成，无跨版本存量） | 不阻塞实现与测试；阻塞任何含存量数据环境的迁移执行 | 声明假设（如上） |

---
title: 'Tasks: AXY-8 登录注册'
description: 登录注册的实现计划(微任务拆分/TDD 步骤/Interfaces)
sidebar_position: 3
---

# AXY-8 登录注册 实现计划

**Goal:** 以 Better Auth 1.7 为底座交付手机号注册、手机号/邮箱格式登录、会话与路由守卫的完整闭环。

**Date:** 2026-11-14

**Spec:** docs/dev/AXY-8-auth/proposal.mdx（需求规范,权威）
**Design:** docs/dev/AXY-8-auth/design.mdx（架构设计,契约来源）

## Global Constraints

- 依赖版本：`better-auth@^1.7`、`@better-auth/redis-storage@^1.7`、`ioredis@^5`、`drizzle-orm@^1`、`postgres`、`next-intl@^4`；dev：`drizzle-kit`（与 drizzle-orm 配套版本）。
- 校验正则单一来源：`PHONE_RE = /^1[3-9]\d{9}$/`、`PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/`、`EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`；`src/lib/auth.ts` 内联副本与 validators 的同步性由单测守护。
- 文案精确值：16 个 next-intl 键（design 文案表）中文文案逐字照抄；E2E 断言以页面渲染文案为准。
- R7 纪律：任何失败情形不得出现可探测账号存在性的差异文案。
- R13 纪律：service/action 及调用链不记录入参；密码只存 `hashPassword` 摘要（`盐:哈希`）。
- 会话：`storeSessionInDatabase: true`（Redis 首查 + PG 兜底）、7 天有效期；退出须同时失效 Redis 键与 PG 行。
- 类型禁推断：`modules/`、`components/` 内导出函数显式返回类型；模块内部一律相对导入（禁自引用顶入口）。
- TDD 铁律：一切产品代码先写失败的测试再实现；每任务收尾跑 `npm test`（及至该任务为止已建的 `npm run test:integration`）。
- 测试命令经 `scripts/run-vitest.mjs` 包装（Windows 盘符问题，勿直接调 vitest CLI）。
- Next 16 与训练数据有破坏性差异：写 App Router 代码前先读 `node_modules/next/dist/docs/` 相应指南。
- 执行环境：集成/E2E 需本地 PG/Redis（Task 1 的 `compose.dev.yaml`）；`npm run build` 与 `docker build` 在**无 .env** 的环境必须仍成功（模块作用域不得抛错、不得发起连接）。
- 提交：Conventional Commits，中文描述。
- Q1/Q2 已豁免（proposal 豁免项表，去向测试提质）：**不安排任何性能验证任务**。

## Review Focus

1. **账号探测差异文案（R7）**：API 直连「用户不存在/密码错误/空密码」三情形若返回不同状态或文案，账号存在性即被探测 → Task 6 集成测试三情形同状态同文案断言 + Task 10 邮箱账号不发起请求直接统一文案的单测。
2. **退出后旧会话残留（R11/B5）**：Redis 键或 PG 行未删，旧 cookie 仍可访问受保护内容 → Task 6 集成：sign-out 后旧 cookie getSession 为空 + Redis 会话键已删。
3. **并发同号双注册（R14）**：唯一索引缺失或事务映射错误导致双账号 → Task 5 集成：同号并发两次恰一次成功。
4. **视图切换丢值/残留错误（R16）**：用户填一半切 tab 后表单清空或旧错误常驻 → Task 9 单测（值保留 + 错误清空 + URL 同步）+ Task 12 E2E 复验。
5. **守卫绕过（B6/R12）**：未登录响应携带受保护内容，或已登录访问 /login 仍渲染表单 → Task 11 布局守卫渲染测试 + Task 12 E2E 断言响应文本不含表单/受保护内容。

---

### Task 1: 底座——依赖、环境与 lib 常量（routes/redis）

**Files:**
- Create: `.env.example`、`compose.dev.yaml`、`src/lib/routes.ts`、`src/lib/redis.ts`
- Modify: `package.json`（依赖 + `dev:infra` 脚本）
- Test: `tests/lib/routes.test.ts`、`tests/lib/redis.test.ts`

**Interfaces:**
- Consumes: 无（首个任务）。
- Produces:
  - `ROUTES: { readonly login: '/login'; readonly register: '/register'; readonly workbench: '/workbench' }`（`as const`，边界 #7 唯一来源，后续所有任务引用）。
  - `redis: Redis`（`src/lib/redis.ts` 单例，`REDIS_URL` 连接，**`lazyConnect: true`**——无 Redis 服务的上下文（build/docker/单测）import 不连接不抛错；首次命令时自动连接，生产行为不变）。

- [ ] **Step 1: 写失败测试**

`tests/lib/routes.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";

describe("ROUTES 路由常量（边界 #7）", () => {
  it("三个路径与 design 契约一致", () => {
    expect(ROUTES).toEqual({ login: "/login", register: "/register", workbench: "/workbench" });
  });
});
```

`tests/lib/redis.test.ts`：`vi.stubEnv("REDIS_URL", "redis://test:6379")` 后动态 `import("@/lib/redis")`，断言 `redis instanceof Redis`、`redis.options.lazyConnect === true`、`redis.status === "wait"`（未连接）。

- [ ] **Step 2: 运行测试，确认以预期方式失败**

Run: `npm test -- tests/lib`
Expected: FAIL——`Cannot find module '@/lib/routes'` / `'@/lib/redis'`。

- [ ] **Step 3: 安装依赖并实现**

安装：`npm install better-auth@^1.7 @better-auth/redis-storage@^1.7 ioredis@^5 drizzle-orm@^1 postgres next-intl@^4 && npm install -D drizzle-kit`。

`src/lib/routes.ts`、`src/lib/redis.ts` 按 Interfaces 签名实现（redis 显式返回类型注解）。

`.env.example`（design 契约原样）：

```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://studybuddy:studybuddy@localhost:5432/studybuddy
REDIS_URL=redis://localhost:6379
```

`compose.dev.yaml`：本地开发专用（不属 ADR-0016 部署拓扑，文件头注释说明）——`pgvector/pgvector:pg17`（ADR-0005：PostgreSQL 17；端口 5432；`POSTGRES_USER/PASSWORD=studybuddy`、`POSTGRES_DB=studybuddy`；healthcheck `pg_isready`；数据卷）+ `redis:7-alpine`（端口 6379；healthcheck `redis-cli ping`）。`package.json` 增 `"dev:infra": "docker compose -f compose.dev.yaml up -d"`。确认 `.env` 在 `.gitignore`（不在则补）。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- tests/lib`
Expected: PASS。

- [ ] **Step 5: 运行全量测试套件，确认全绿**

Run: `npm test`
Expected: PASS（含既有 smoke/render）。

- [ ] **Step 6: 提交**（`chore: 安装认证与数据层依赖,落路由常量与 redis 单例`）

---

### Task 2: modules/auth/validators.ts（纯函数校验）

**Files:**
- Create: `src/modules/auth/validators.ts`
- Test: `tests/auth/validators.test.ts`

**Interfaces:**
- Consumes: 无。
- Produces（design 契约原样，签名级）:
  - `PHONE_RE` / `EMAIL_RE` / `PASSWORD_RE`（RegExp 常量，值见 Global Constraints）
  - `type AccountKind = 'phone' | 'email'`；`type AccountCheck = { ok: true; kind: AccountKind } | { ok: false; messageKey: 'auth.account.required' | 'auth.account.invalid' }`
  - `validateAccount(raw: string): AccountCheck`
  - `validatePassword(raw: string): { ok: true } | { ok: false; messageKey: 'auth.password.required' | 'auth.password.invalid' }`
  - `type RegisterFormErrors = Partial<{ phone: 'auth.register.phoneInvalid'; password: 'auth.password.required' | 'auth.password.invalid'; confirmPassword: 'auth.register.passwordMismatch'; agreement: 'auth.agreement.required' }>`
  - `validateRegisterForm(v: { phone: string; password: string; confirmPassword: string; agreementAccepted: boolean }): RegisterFormErrors | null`

- [ ] **Step 1: 写失败测试**（用例值取自 R2/R3/R8 与 AC-5）

```
PHONE_RE：接受 13800138000、19912345678；拒绝 1380013800(10位)、23800138000(首位 2)、12345678901(1x 号段外)、含空格。
EMAIL_RE：接受 name@mail.com；拒绝 abc@mail(无后缀)、a b@mail.com。
PASSWORD_RE：接受 abcd1234、a1234567；拒绝 12345678(纯数字)、abcdefgh(纯字母)、1234567(7 位)、abcd12345678901234567(21 位)。
validateAccount：''→required；'1380013800'→invalid；'abc@mail'→invalid；
  '13800138000'→{ok:true,kind:'phone'}；'name@mail.com'→{ok:true,kind:'email'}。
validatePassword：''→required；'12345678'→invalid；'abcd1234'→{ok:true}。
validateRegisterForm：
  phone '1380013800' → { phone: 'auth.register.phoneInvalid' }
  password '' → { password: 'auth.password.required' }；'12345678' → invalid
  confirmPassword ''（R8：为空即不一致）→ { confirmPassword: 'auth.register.passwordMismatch' }
  confirmPassword ≠ password → passwordMismatch
  agreementAccepted false → { agreement: 'auth.agreement.required' }
  多字段同时错 → 合并返回同一对象
  全合法 → null
```

- [ ] **Step 2: 运行测试，确认以预期方式失败**

Run: `npm test -- tests/auth`
Expected: FAIL——模块不存在。

- [ ] **Step 3: 实现 `src/modules/auth/validators.ts`**

纯函数、零 IO、显式返回类型。confirmPassword 为空与不一致同归 `passwordMismatch`（R8 文案「两次输入的密码不一致」）；确认密码框的强度规则由「与 password 一致」间接保证（password 自身守 R3）。

- [ ] **Step 4: 运行测试，确认通过**（`npm test -- tests/auth`）
- [ ] **Step 5: 全量 `npm test` 全绿**
- [ ] **Step 6: 提交**（`feat(auth): 表单校验纯函数 validators`）

---

### Task 3: modules/auth/schema.ts 与 db 底座、迁移

**Files:**
- Create: `src/modules/auth/schema.ts`、`src/db/schema.ts`、`src/db/client.ts`、`drizzle.config.ts`、`src/db/migrations/`（生成物）
- Modify: `package.json`（`db:generate` / `db:migrate` 脚本）
- Test: `tests/auth/schema.test.ts`

**Interfaces:**
- Consumes: `PHONE_RE`、`PASSWORD_RE`（Task 2，模块内相对导入 `./validators`）。
- Produces:
  - drizzle pgTable `user` / `account` / `session` / `verification`（列属性名 camelCase——即 Better Auth 字段名，DB 列名经 client 的 `casing: 'snake_case'` 转换；字段清单精确照 design 数据模型表：user 含 `phoneNumber` 唯一（显式索引名 `user_phone_number`）、`agreementVersion`、`agreedAt` 等；account 含 `providerId`、`accountId`、`password` nullable、`userId` FK CASCADE；session 含 `token` 唯一、`expiresAt`）
  - `registerInputSchema` + `type RegisterInput = z.infer<typeof registerInputSchema>`（design 代码原样）
  - `db`（`src/db/client.ts`：`drizzle(postgres(process.env.DATABASE_URL ?? 'postgresql://localhost:5432/studybuddy'), { schema, casing: 'snake_case' })`——**env 缺省时不得抛错**，postgres-js 惰性连接）
  - `src/db/schema.ts`：`export * from '@/modules/auth/schema'`（公共契约 barrel）

- [ ] **Step 1: 写失败测试**

```
registerInputSchema（zod）：合法入参通过；phone '1380013800' 拒绝；password '12345678' 拒绝；
  confirmPassword 不一致拒绝；agreementAccepted: false 拒绝（z.literal(true)）。
getTableConfig(user)：phoneNumber 列 notNull；唯一索引含 'user_phone_number'；email notNull 且唯一；
  agreementVersion notNull；agreedAt notNull；id 主键。
getTableConfig(account)：userId 外键指向 user.id 且 onDelete cascade；password 列 nullable；providerId 列存在。
getTableConfig(session)：token 唯一；userId 外键 cascade。
```

- [ ] **Step 2: 确认失败**（`npm test -- tests/auth` → FAIL 模块不存在）

- [ ] **Step 3: 实现 schema 与 db 底座**

按 Interfaces 与 design 数据模型表建四张表；`src/db/client.ts` 构造单例 `db`（显式类型 `NodePgDatabase<typeof schema>`）；`drizzle.config.ts`：dialect `postgresql`、schema `./src/db/schema.ts`、out `./src/db/migrations`、dbCredentials 从 `process.env.DATABASE_URL` 读。`package.json` 增 `"db:generate": "drizzle-kit generate"`、`"db:migrate": "drizzle-kit migrate"`。

- [ ] **Step 4: 确认通过**（`npm test -- tests/auth`）

- [ ] **Step 5: 生成迁移并核对 SQL**

Run: `npm run db:generate`
Expected: `src/db/migrations/` 产出 SQL，含 `CREATE UNIQUE INDEX "user_phone_number"` 与四张表（snake_case 列名）。人工核对 SQL 与 design 数据模型表逐列一致。

- [ ] **Step 6: 全量 `npm test` 全绿；无 .env 跑 `npm run build` 仍成功**（db client 模块作用域守卫）
- [ ] **Step 7: 提交**（`feat(auth): 用户/会话/凭据表 schema 与迁移`）

---

### Task 4: lib/auth.ts（Better Auth 实例）与 auth-client、API 挂载

**Files:**
- Create: `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/app/api/auth/[...all]/route.ts`
- Test: `tests/lib/auth.test.ts`、`tests/lib/auth-client.test.ts`

**Interfaces:**
- Consumes: `db`（Task 3）、`redis`（Task 1）、validators 的 `PHONE_RE`（源码同步守护）。
- Produces:
  - `auth`（betterAuth 实例，配置照 design 契约逐项：drizzleAdapter/pg、redisStorage、`storeSessionInDatabase: true`、`emailAndPassword` 8–20、phoneNumber 插件（`phoneNumberValidator` + no-op `sendOTP`）、before-hook 403 禁 `/sign-up/email` 与 `/sign-in/email`、`trustedOrigins`）
  - `auth.handler`（供 Task 6 集成测试直调）
  - `authClient`（`createAuthClient` + `phoneNumberClient()`；`authClient.signIn.phoneNumber({ phoneNumber, password })`、`authClient.signOut()`）

- [ ] **Step 1: 写失败测试**

`tests/lib/auth.test.ts`：
1. **源码同步守护**：`readFileSync('src/lib/auth.ts', 'utf8')`，提取 `const PHONE_RE = /(.+)/` 的正则字面量，断言其 source 与 `validators.PHONE_RE.source` 相等（design：内联副本同步性由单测守护）。
2. `vi.stubEnv('BETTER_AUTH_SECRET', 'x'.repeat(32))`、`BETTER_AUTH_URL` 后动态 import → `typeof auth.handler === 'function'`。

`tests/lib/auth-client.test.ts`：`typeof authClient.signIn.phoneNumber === 'function'`、`typeof authClient.signOut === 'function'`——**此处闭合开放问题 #2**：若方法名不一致（SDK 类型为准），停下记裁决并回写 design 开放问题表，再继续。

- [ ] **Step 2: 确认失败**（`npm test -- tests/lib` → FAIL 模块不存在）

- [ ] **Step 3: 实现三个文件**

`lib/auth.ts` 照 design 契约代码逐项落（含注释里的取舍依据）；`lib/auth-client.ts` 与 `api/auth/[...all]/route.ts`（`toNextJsHandler(auth.handler)`）照 design。user 表的额外字段（phoneNumber/agreementVersion 等）若 betterAuth 类型需要 `user.additionalFields` 声明，按官方类型提示补上（不改表结构）。

- [ ] **Step 4: 确认通过**（`npm test -- tests/lib`）
- [ ] **Step 5: 全量 `npm test` 全绿；无 .env 跑 `npm run build` 仍成功**（betterAuth 初始化不得在模块作用域抛错；`docker build --target runner` 本地跑一次同验）

- [ ] **Step 6: 提交**（`feat(auth): Better Auth 实例与端点挂载,禁用邮箱端点`）

---

### Task 5: modules/auth/service.ts（注册事务）+ 集成测试基座

**Files:**
- Create: `src/modules/auth/service.ts`、`vitest.config.integration.ts`、`tests/integration/global-setup.ts`、`tests/integration/helpers.ts`、`tests/integration/auth/service.test.ts`
- Modify: `vitest.config.ts`（exclude `tests/integration/**`）、`package.json`（`test:integration` 脚本）

**Interfaces:**
- Consumes: `db`、schema 表、validators 正则。
- Produces:
  - `AGREEMENT_VERSION = 'v1' as const`
  - `phoneToPlaceholderEmail(phone: string): string`（返回 `` `${phone}@phone.styb.invalid` ``）
  - `type RegisterOutcome = { ok: true; userId: string } | { ok: false; error: 'PHONE_ALREADY_REGISTERED' }`
  - `registerWithPhone(input: { phone: string; password: string }): Promise<RegisterOutcome>`（单事务插 user + credential account；PG 23505 且 `constraint === 'user_phone_number'` → PHONE_ALREADY_REGISTERED；全链路不记录入参）
  - 测试基座：`npm run test:integration`（node 环境、env 默认指向 compose.dev 的 DATABASE_URL/REDIS_URL、globalSetup 以 drizzle migrator 应用 `src/db/migrations`）；helper `uniquePhone(): string`（每次调用返回不重复合法手机号，防限流与唯一冲突串扰）
  - `npm test` 不再包含 `tests/integration/**`（CI 无库上下文，Task 13 才接入服务）

- [ ] **Step 1: 写失败测试**

`tests/integration/auth/service.test.ts`（真实 PG，`docker compose -f compose.dev.yaml up -d` 前置）：

```
1. 注册成功（R9/R13/R15）：ok:true；查库 user 行 name=手机号、email=`${phone}@phone.styb.invalid`、
   phone_number=手机号、agreement_version='v1'、agreed_at>用例开始时间；account 行 provider_id='credential'、
   account_id=user.id、password 匹配 /^\S+:\S+$/ 且不含明文，verifyPassword(摘要, 明文)===true。
2. 同号再注册（R10）：{ok:false,error:'PHONE_ALREADY_REGISTERED'}；user 表该手机号仍恰 1 行。
3. 并发同号（R14）：Promise.allSettled 两次 registerWithPhone 同号 → 恰一 ok 一 PHONE_ALREADY_REGISTERED。
```

- [ ] **Step 2: 确认失败**

Run: `npm run dev:infra && npm run test:integration`
Expected: FAIL——`service` 模块不存在（集成配置先落，失败原因必须是模块缺失而非配置错误）。

- [ ] **Step 3: 实现 service 与集成基座**

`registerWithPhone`：`db.transaction` 内先插 user（含 agreement 字段）再插 account（密码经 `hashPassword`，import 自 `better-auth/crypto`）；catch 23505 按约束名映射。`vitest.config.integration.ts`（environment node、include `tests/integration/**/*.test.ts`、env 兜底值、globalSetup 调 `migrate(db, { migrationsFolder: 'src/db/migrations' })`）；`vitest.config.ts` 的 include 增加 exclude `["tests/integration/**", "**/node_modules/**"]`；`package.json` 增 `"test:integration": "node scripts/run-vitest.mjs run --config vitest.config.integration.ts"`。

- [ ] **Step 4: 确认通过**（`npm run test:integration`）
- [ ] **Step 5: 全量：`npm test`（单测不受集成分轨影响）全绿**
- [ ] **Step 6: 提交**（`feat(auth): 手机号注册事务与集成测试基座`）

---

### Task 6: Better Auth 端点集成——R7 统一文案、hook 403、会话双写与退出

**Files:**
- Create: `tests/integration/auth/endpoints.test.ts`
- Modify: `tests/integration/helpers.ts`（增端点辅助）
- Test: 即上述 endpoints 文件（本任务纯测试任务 + 兜底裁决，无新增产品代码；若触发兜底则增 `src/modules/auth/actions.ts` 的登录包装——见 Step 3 注）

**Interfaces:**
- Consumes: `auth.handler`（Task 4）、`registerWithPhone`（Task 5）。
- Produces（供 Task 7 测试复用的 helpers）:
  - `directPost(path: string, body: unknown, cookie?: string): Promise<Response>`（构造 `Request` 直调 `auth.handler`，body JSON）
  - `signInAndGetCookie(phone: string, password: string): Promise<string>`（正确密码登录，返回 set-cookie 头值）

- [ ] **Step 1: 写失败测试**

`tests/integration/auth/endpoints.test.ts`（各用例独立 `uniquePhone()`，防插件 10 次/60 秒限流串扰；偶发 429 先查限流再查业务）：

```
1. R7 三情形同文案：先经 registerWithPhone 造一个真实账号；对 /api/auth/sign-in/phone-number 三次 directPost：
   ①未注册号+任意密码 ②已注册号+错密码 ③已注册号+空密码（模拟绕过前端）——
   断言三者 HTTP 状态码相同、响应体错误标识（code 与 message 字段）完全一致，
   且不出现「未注册」「密码错误」类差异字样。
2. hook 403：directPost /api/auth/sign-up/email 与 /sign-in/email（任意 body）→ 403。
3. 登录成功双写（B5）：正确密码 → 200 + set-cookie；PG session 行存在（user_id/expires_at）；
   redis.keys('better-auth:*') 存在以 keyPrefix 起头的会话键（键名格式以 Better Auth 1.7 实际为准，断言存在即可）。
4. 退出失效（R11 服务端半边）：携 cookie directPost /api/auth/sign-out → 200；
   随后旧 cookie directPost /api/auth/get-session → 响应不含用户；该会话的 Redis 键已删；PG session 行已删。
```

- [ ] **Step 2: 确认失败**（`npm run test:integration` → FAIL：helpers 的 directPost 未实现）

- [ ] **Step 3: 补胶水至通过**

实现 helpers。**开放问题 #1 闭合点**：若用例 1 发现插件原生三情形不同状态/不同文案 → 触发 design 兜底：登录改由 Server Action 包装 `auth.api.signInPhoneNumber` 统一返回（数据模型/组件树不变），记入下方裁决记录并回写 design 开放问题表；若原生一致（同族源码佐证的预期结果）→ 在 design 开放问题表补「已实测闭合」结论。

- [ ] **Step 4: 确认通过**（`npm run test:integration` 全绿）
- [ ] **Step 5: 全量 `npm test` 全绿**
- [ ] **Step 6: 提交**（`test(auth): 端点级 R7 统一文案与退出失效集成验证`）

---

### Task 7: modules/auth 的 queries / actions / errors 与模块顶入口

**Files:**
- Create: `src/modules/auth/errors.ts`、`src/modules/auth/queries.ts`、`src/modules/auth/actions.ts`、`src/modules/auth/index.ts`
- Test: `tests/auth/errors.test.ts`、`tests/integration/auth/actions.test.ts`、`tests/integration/auth/queries.test.ts`

**Interfaces:**
- Consumes: `registerWithPhone`、`registerInputSchema`（Task 5/3）；helpers `signInAndGetCookie`（Task 6）。
- Produces:
  - `type SignInErrorKey = 'auth.error.invalidCredentials' | 'auth.error.tooManyAttempts' | 'auth.error.unknown'`
  - `mapSignInError(err: { status?: number; code?: string } | null | undefined): SignInErrorKey`
  - `type AuthSession = { user: { id: string; name: string; phoneNumber: string }; session: { id: string; userId: string; expiresAt: Date } }`
  - `getCurrentSession(): Promise<AuthSession | null>`（封装 `auth.api.getSession({ headers: await headers() })`）
  - `type RegisterActionResult = { ok: true } | { ok: false; error: 'INVALID_INPUT'; fieldErrors: RegisterFormErrors } | { ok: false; error: 'PHONE_ALREADY_REGISTERED' }`
  - `registerAction(input: RegisterInput): Promise<RegisterActionResult>`（`'use server'`）
  - `src/modules/auth/index.ts`：`export { getCurrentSession, registerAction }` + `export type { AuthSession, RegisterActionResult, RegisterInput }`（后续任务扩展）

- [ ] **Step 1: 写失败测试**

```
tests/auth/errors.test.ts（单测）：
  mapSignInError({status:401}) → 'auth.error.invalidCredentials'；
  {status:400, code:'INVALID_PHONE_NUMBER'} → invalidCredentials；{status:429} → tooManyAttempts；
  null / undefined / {status:500} → 'auth.error.unknown'。
tests/integration/auth/actions.test.ts（真实 PG）：
  合法入参 → {ok:true} 且库有 user/account 行；
  phone '1380013800' → {ok:false,error:'INVALID_INPUT',fieldErrors:{phone:'auth.register.phoneInvalid'}}；
  同号重复 → PHONE_ALREADY_REGISTERED。
tests/integration/auth/queries.test.ts（真实会话 + vi.mock('next/headers')）：
  无 cookie（headers 空）→ null；
  signInAndGetCookie 后 headers 带该 cookie → AuthSession 形状
  （user.id/name=手机号/phoneNumber、session.id/userId/expiresAt instanceof Date）。
```

- [ ] **Step 2: 确认失败**（三个文件分别模块不存在）
- [ ] **Step 3: 实现三个文件 + index.ts**（签名照 Interfaces；actions 内 zod 复验失败时以 `registerInputSchema` 的字段路径组装 fieldErrors；`getCurrentSession` 内部 try/catch 归一为 null）
- [ ] **Step 4: 确认通过**（`npm test -- tests/auth` + `npm run test:integration`）
- [ ] **Step 5: 全量 `npm test` 全绿**
- [ ] **Step 6: 提交**（`feat(auth): 会话查询/注册 action/错误映射与模块出口`）

---

### Task 8: next-intl 最小设施与文案

**Files:**
- Create: `src/i18n/request.ts`、`src/locales/zh-CN/auth.json`
- Modify: `next.config.ts`（`createNextIntlPlugin`）、`src/app/layout.tsx`（挂 `NextIntlClientProvider` + `getMessages()`）
- Test: `tests/i18n/messages.test.ts`、`tests/i18n/request.test.ts`

**Interfaces:**
- Consumes: 无（文案表来自 design）。
- Produces: `useTranslations('auth')` 命名空间可用（auth.json 嵌套结构：`{ account: { required, invalid }, password: {...}, register: {...}, agreement, error: {...}, forgotPassword, oauth, summary, submit }`，共 16 键）；`getRequestConfig`（cookie 协议、缺省兜底 `zh-CN`，ADR-0010 无前缀策略）。

- [ ] **Step 1: 写失败测试**

```
tests/i18n/messages.test.ts：import auth.json，逐键断言与 design 文案表逐字一致，共 16 条。样例：
  account.required = '请输入手机号或邮箱'
  account.invalid = '格式不对：手机号 11 位，或 name@mail.com'
  password.invalid = '密码为 8—20 位，需含字母与数字'
  register.phoneInvalid = '请输入 11 位有效手机号'
  register.passwordMismatch = '两次输入的密码不一致'
  agreement.required = '请阅读并勾选《用户协议》与《隐私政策》'
  error.invalidCredentials = '账号或密码不对'
  error.tooManyAttempts = '操作过于频繁，请稍后再试'
  error.phoneRegistered = '该手机号已注册，去登录'
  error.unknown = '出了点问题，请稍后再试'
  forgotPassword.unavailable = '找回密码功能暂未开通'
  oauth.placeholder = '本期不做，仅占位'
  summary.errors = '有 {count} 项需要修改'（ICU，count 为占位符）
  submit.loggingIn = '登录中…' / submit.registering = '注册中…'
tests/i18n/request.test.ts：getRequestConfig({ requestLocale: Promise.resolve(undefined) })
  → locale 为 'zh-CN' 且 messages.auth 存在（无 cookie 兜底）。
```

- [ ] **Step 2: 确认失败**（模块/文件不存在）
- [ ] **Step 3: 实现**：request.ts（`src/locales/zh-CN/auth.json` 以 `auth` 命名空间并入 messages）；next.config.ts 接插件；根布局包 `NextIntlClientProvider`（实现前先读 `node_modules/next/dist/docs/` 根布局与 i18n 相关指南——Next 16 差异）。
- [ ] **Step 4: 确认通过**；若既有 `tests/render.test.tsx` 因缺 provider 失败，在该测试的渲染处包 `NextIntlClientProvider`（测试侧适配，不改产品断言）
- [ ] **Step 5: 全量 `npm test` 全绿 + `npm run build` 绿**
- [ ] **Step 6: 提交**（`feat(i18n): next-intl 最小设施与 auth 文案`）

---

### Task 9: AuthScreen 与表单校验 UI（渲染层，不接网络）

**Files:**
- Create: `src/modules/auth/components/` 下 `AuthScreen.tsx`、`AuthTabs.tsx`、`LoginForm.tsx`、`RegisterForm.tsx`、`AccountField.tsx`、`PhoneField.tsx`、`PasswordField.tsx`、`AgreementCheckbox.tsx`、`FormSummary.tsx`、`SubmitButton.tsx`、`ForgotPasswordLink.tsx`、`OAuthPlaceholder.tsx`、`ViewSwitchLink.tsx`
- Test: `tests/auth/components/validation.test.tsx`、`tests/auth/components/view-switch.test.tsx`

**Interfaces:**
- Consumes: `validateAccount` / `validatePassword` / `validateRegisterForm`（Task 2）、`ROUTES`（Task 1）、`useTranslations('auth')`（Task 8）。
- Produces: `AuthScreen`，props `{ initialView: 'login' | 'register' }`；状态全部提升于 AuthScreen（`activeView`、表单值 `{ account, password, confirmPassword, agreementAccepted }`、`errors`、`submitting`——R16 切换保留、错误清空）；子组件纯受控。Task 10/11 依赖此组件树形态。

- [ ] **Step 1: 写失败测试**（@testing-library/react，`NextIntlClientProvider` 包装渲染，文案逐字断言）

```
validation.test.tsx：
  登录校验链（R1/R2/R3/R4）：账号留空+密码 a1234567 提交 → 「请输入手机号或邮箱」+ 顶部「有 1 项需要修改」，不触发提交；
    账号密码双空 → 「有 2 项需要修改」；'1380013800'/'abc@mail' → 「格式不对：手机号 11 位，或 name@mail.com」，
    改填合法后提示消失；'12345678'/21 位 → 「密码为 8—20 位，需含字母与数字」；
    合法账号密码未勾选协议提交 → 勾选框错误态（aria-invalid）+ 不提交。
  注册校验链（R8）：手机号 '1380013800' → 「请输入 11 位有效手机号」；确认密码空/不一致 → 「两次输入的密码不一致」；
    未勾选 → 勾选错误态。
  R17：PasswordField 显隐按钮点击后 input type password→text（三处输入框同构复用）。
  R18：两个第三方占位按钮 disabled 且文案「本期不做，仅占位」。
  R19：点击「忘记密码?」→ 「找回密码功能暂未开通」出现，无导航（preventDefault）。
view-switch.test.tsx（R16）：login 视图填入账号/密码 → 切到 register → 输入框值保留；
  制造错误后切换 → 错误清空；spy history.replaceState → 以 '/register' 调用。
```

- [ ] **Step 2: 确认失败**（组件不存在）
- [ ] **Step 3: 实现**（Tailwind 4 手写对齐线框图；不引 shadcn；`'use client'`；模块内相对导入、`@/lib/routes`；PhoneField `maxLength={11}` 边界 #1；AgreementCheckbox 协议链接 `preventDefault` 边界 #9；FormSummary 按 errors 键数计数 + ICU `{count}`；SubmitButton 受 `submitting` 与文案键驱动——本任务 submitting 恒 false，提交处理由 Task 10 接入）
- [ ] **Step 4: 确认通过**（`npm test -- tests/auth/components`）
- [ ] **Step 5: 全量 `npm test` 全绿**
- [ ] **Step 6: 提交**（`feat(auth): 登录注册表单校验 UI 与视图切换`）

---

### Task 10: 登录/注册提交流程（客户端半边）

**Files:**
- Modify: `src/modules/auth/components/AuthScreen.tsx`、`LoginForm.tsx`、`RegisterForm.tsx`（接 onSubmit）
- Test: `tests/auth/components/submission.test.tsx`

**Interfaces:**
- Consumes: `registerAction`（Task 7，相对导入 `../actions`）、`authClient`（Task 4，`@/lib/auth-client`）、`mapSignInError`（Task 7）、`ROUTES`。
- Produces: 行为契约（Task 11/12 依赖）：注册成功 → `authClient.signIn.phoneNumber` 自动登录 → `router.replace(ROUTES.workbench)`；登录成功同 replace；失败错误置顶呈现；邮箱形态账号（`validateAccount` kind='email'）不发起请求、直接呈现 R7 统一文案（B2）。

- [ ] **Step 1: 写失败测试**（vi.mock `../actions`、`@/lib/auth-client`、`next/navigation` 的 `useRouter`）

```
注册成功链（R9）：registerAction resolve {ok:true} → authClient.signIn.phoneNumber 以 {phoneNumber, password} 被调
  → router.replace('/workbench')。
R5：registerAction 挂起（未 resolve 的 Promise）→ 按钮「注册中…」且 disabled；登录同理「登录中…」。
R10：registerAction resolve {ok:false,error:'PHONE_ALREADY_REGISTERED'} → 顶部「该手机号已注册，去登录」；
  点「去登录」→ activeView 切 'login' 且账号框值为该手机号。
R7 客户端：signIn.phoneNumber reject {status:401} → 「账号或密码不对」；reject {status:429} → 「操作过于频繁，请稍后再试」。
B2：账号填 'name@mail.com' 合法密码提交 → signIn.phoneNumber 未被调，「账号或密码不对」直接呈现。
R6：登录成功 → router.replace('/workbench')（链路无任何档案查询）。
```

- [ ] **Step 2: 确认失败**（提交行为未实现：断言的调用与文案均不发生）
- [ ] **Step 3: 实现提交流程**（submitting 置位→await→复位；失败经 mapSignInError / fieldErrors 呈现；成功一律 `router.replace`）
- [ ] **Step 4: 确认通过**（`npm test -- tests/auth/components`）
- [ ] **Step 5: 全量 `npm test` 全绿**
- [ ] **Step 6: 提交**（`feat(auth): 登录注册提交流程与统一错误呈现`）

---

### Task 11: 路由壳、守卫与 workbench 占位

**Files:**
- Create: `src/app/(auth)/layout.tsx`、`src/app/(auth)/login/page.tsx`、`src/app/(auth)/register/page.tsx`、`src/app/(app)/layout.tsx`、`src/app/(app)/workbench/page.tsx`、`src/modules/auth/components/AuthRedirect.tsx`、`src/modules/auth/components/SignOutButton.tsx`
- Modify: `src/modules/auth/index.ts`（增 `export { AuthScreen } from './components/AuthScreen'`、`export { AuthRedirect }`、`export { SignOutButton }`）
- Test: `tests/auth/components/auth-redirect.test.tsx`、`tests/auth/route-guards.test.tsx`

**Interfaces:**
- Consumes: `getCurrentSession`（Task 7，经 `@/modules/auth` 顶入口）、`AuthScreen`（Task 9）、`authClient.signOut`、`ROUTES`。
- Produces: 路由薄壳（design 契约）：(auth) 布局已登录 → 渲染 `AuthRedirect` 不渲染 children（R12）；(app) 布局未登录 → `redirect(ROUTES.login)`（B6）；`workbench/page.tsx` 占位（标题「工作台」+ `session.user.phoneNumber` + `SignOutButton`，AXY-12 替换，E2E 验收锚点）。

- [ ] **Step 1: 写失败测试**

```
auth-redirect.test.tsx（mock useRouter；Object.defineProperty(window.history,'length') 可配）：
  history.length=2 → router.back() 被调；length=1 → router.replace('/workbench')。
route-guards.test.tsx（vi.mock('@/modules/auth') 的 getCurrentSession；mock next/navigation 的 redirect 使其 throw；
  布局是 async 组件——`const ui = await AuthLayout({ children }); render(ui)`）：
  (auth) 布局：session null → children 渲染；session 存在 → children（表单元素）不在文档中，AuthRedirect 在。
  (app) 布局：session null → redirect 以 '/login' 抛出（B6，未登录不渲染受保护内容）；
    session 存在 → children 渲染。
SignOutButton：点击 → authClient.signOut 被调 → router.replace('/login')；signOut reject → 仍 replace。
```

- [ ] **Step 2: 确认失败**（模块/路由不存在）
- [ ] **Step 3: 实现薄壳**（实现前读 `node_modules/next/dist/docs/` 路由组/布局指南——Next 16 差异；页面文件零业务逻辑）
- [ ] **Step 4: 确认通过**（`npm test -- tests/auth`）
- [ ] **Step 5: 全量 `npm test` 全绿 + `npx next typegen && npm run type-check` 绿 + `npm run build` 绿（路由组类型生成）**
- [ ] **Step 6: 提交**（`feat(auth): 路由组薄壳/会话守卫/工作台占位页`）

---

### Task 12: E2E 全流程

**Files:**
- Create: `e2e/auth.spec.ts`、`e2e/helpers/auth.ts`（`uniquePhone()`、`registerViaUI(page, phone, password)`）
- Test: 即上述 spec（本任务的测试即交付物）

**Interfaces:**
- Consumes: 全部前序产物（经生产构建 + 真实 PG/Redis）。
- Produces: E2E 证据（R1–R6、R8–R12、R16–R19 的浏览器级验证记录；R7 的双半边证据在 Task 6/10，E2E 仅复验呈现）。

- [ ] **Step 1: 写 E2E 用例**（文案断言以页面渲染为准，逐字）

```
校验链组（R1/R2/R3/R4/R8/R17/R18/R19）：登录与注册两视图的全部字段级文案、汇总计数、
  协议错误态、密码显隐、占位按钮禁用、忘记密码提示。
注册流程（R5/R9/R10）：注册成功 → URL /workbench 且渲染「工作台」占位与退出按钮；
  按钮加载态——page.route 拦截 /api/auth/sign-in/phone-number 延迟 300ms，断言「登录中…」+ disabled；
  重复注册 → 「该手机号已注册，去登录」→ 点击切登录视图且账号框带入该手机号。
登录流程（R6）：两个账号（各自经 UI 注册，链路无档案概念）分别登录 → 均落 /workbench，行为一致。
会话流程（R11）：退出 → /login；直访 /workbench → 重定向 /login；browser back → /login；
  重新登录同号 → /workbench 且手机号与原账号一致（数据完好）。
守卫流程（R12 + B6）：已登录经站内导航到 /login（有历史）→ 自动返回工作台；
  新建 context 直开 /login（无历史）→ 落 /workbench；
  未登录访问 /workbench：读取响应原文（page.request 或 context.request）断言不含受保护内容标识。
R16：填值切 tab → 值保留、URL 经 replaceState 同步为 /register。
```

- [ ] **Step 2: 运行，确认失败并记录**

前置：`npm run dev:infra`、`.env` 从 `.env.example` 复制就位（`BETTER_AUTH_SECRET` 填 32+ 字符随机串）、`npm run db:migrate`。
Run: `npm run test:e2e`
Expected: FAIL——记录失败清单（预期为跨层胶水缺口：webServer 环境变量注入、种子数据、文案渲染差异；若全部用例直接通过，逐条核对断言强度后在本任务提交信息注明）。

- [ ] **Step 3: 修复胶水至全绿**（发现产品缺陷 → 回对应模块修复并补单测，偏离记裁决）
- [ ] **Step 4: 全量三套件全绿**：`npm test` + `npm run test:integration` + `npm run test:e2e`
- [ ] **Step 5: 提交**（`test(e2e): 登录注册全流程端到端验证`）

---

### Task 13: CI 接入 PG/Redis 服务、文档同步与收尾

**Files:**
- Modify: `.github/workflows/ci.yml`（verify job）、`AGENTS.md`
- Test: 无新增测试文件（验证方式见步骤）

**Interfaces:**
- Consumes: `test:integration`（Task 5）、`db:migrate`（Task 3）、compose.dev 凭据（Task 1）。
- Produces: CI 流水线对集成/E2E 真实执行（PR 即全量门禁）；AGENTS.md 与工程现状一致。

- [ ] **Step 1: 修改 ci.yml verify job**：增 `services:`——`postgres`（镜像 `pgvector/pgvector:pg17`，env/health options 与 compose.dev 同参）与 `redis`（`redis:7-alpine`，health `redis-cli ping`）；job 级 `env` 注入 `DATABASE_URL`（指向 services 别名 `postgres`）、`REDIS_URL`、`BETTER_AUTH_SECRET`（CI 专用随机串，非生产机密——ADR-0022 零机密接触不破）、`BETTER_AUTH_URL=http://localhost:3000`；Build/单测/E2E 步骤继承 env；在 Unit tests 后增 `Integration tests (Vitest)` 步骤跑 `npm run test:integration`（迁移由其 globalSetup 自理）；E2E 前确保迁移已应用（复用 globalSetup 思路或显式 `npm run db:migrate` 步骤）。
- [ ] **Step 2: 本地核对**：`npm run build`（无 .env）与 `docker build --target runner` 仍绿；YAML 语法核对。CI 全量绿以推送后的 PR 流水线为准（DOD 阶段 4/5 在合流时闭合，由人工决定何时开 PR）。
- [ ] **Step 3: AGENTS.md 同步**：常用命令补 `test` / `test:integration` / `test:e2e` / `db:generate` / `db:migrate` / `dev:infra`；删除「尚未安装测试框架」旧描述；注明本地 PG/Redis 经 `compose.dev.yaml` 提供、`.env` 从 `.env.example` 复制。
- [ ] **Step 4: 全量本地三套件绿后提交**（`chore(ci): 流水线接入 PG/Redis,同步工程文档`）

---

## 裁决记录

执行中发现的计划缺陷记入此处，格式：`裁决: <决定了什么> — <为什么> — <错了的代价>`。

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

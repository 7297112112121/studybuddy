---
title: 事故报告:开发服务器登录后不跳转工作台(__Secure- Cookie 被 HTTP 环境丢弃)
description: 2026-11-18 开发服务器(80 端口)登录成功但无法保持会话的事故复盘——__Secure- Cookie 前缀与 BETTER_AUTH_URL 的知识点解释、排查过程、修复方案与遗留风险
sidebar_position: 6
---

# 事故报告:开发服务器登录后不跳转工作台

## 事故概要

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-11-18 |
| 环境 | 开发服务器(studybuddy-dev,Caddy 反代 80 端口 → app:3000,`NODE_ENV=production`) |
| 现象 | 登录/注册提交后未跳转到工作台,页面回落到 `/login`,表现为「登录无效」 |
| 影响范围 | 开发环境全部登录/注册用户;接口本身无故障,本地开发环境不受影响 |
| 严重级别 | 低(环境配置问题,无数据损失;但阻塞开发服务器可用性) |
| 状态 | 已修复并验证 |

## 现象本质

登录请求**实际是成功的**:`POST /api/auth/sign-in/username` 返回 200,会话已在服务端创建。失败发生在更后面——**会话 Cookie 被浏览器丢弃**,导致浏览器侧从未真正「登录」:

1. Better Auth 下发的会话 Cookie 带 `__Secure-` 前缀 + `Secure` 属性;
2. 访问协议是纯 HTTP(`http://106.55.48.38`),浏览器按规范**直接丢弃**这类 Cookie;
3. 客户端拿到 200 后 `router.replace(ROUTES.workbench)` 跳转工作台;
4. `(app)` 布局的服务端守卫读不到会话 Cookie,`redirect(ROUTES.login)` 弹回登录页。

用户视角就是「登录后没跳转」,实际是「跳转了,又被守卫弹回来」。

## 排查过程

采用「本地基线 → 远程复现 → 抓包对比」的对照思路:

1. **本地基线确认**:起本地 PG/Redis + dev server,Playwright 实测注册自动登录、登出、手动登录均正常跳转 `/workbench`——代码主链路无问题,问题必然出在部署环境差异上。
2. **远程复现**:Playwright 在 `http://106.55.48.38` 注册,页面落在 `/login`;网络面板显示 sign-in 返回 200,且 `/workbench` RSC 请求也返回 200(内容是守卫 redirect 后的登录页)。
3. **curl 直接验证**:绕开浏览器抓包,直接向 sign-in 端点发请求,拿到完整 `Set-Cookie` 头,发现 `__Secure-` 前缀与 `Secure` 属性——纯 HTTP 下必被浏览器丢弃,根因锁定。
4. **源码确认**:读本地 `node_modules/better-auth/dist/cookies/index.mjs`,确认 secure 判定链(见下文「根因分析」)。

> 排查中的干扰项:远程容器的 `trustedOrigins` 回退值是 `http://localhost:3000`,看起来像 CSRF 源校验问题,但实测 sign-in 通过——因为当时 `BETTER_AUTH_URL` 未设,baseURL 走了动态推断,origin 校验对上了请求自身的源。这个嫌疑被排除后才聚焦到 Cookie 属性。

## 根因分析

### 配置缺失

远程部署目录 `/opt/studybuddy/.env` 只提供了 `POSTGRES_PASSWORD` / `DATABASE_URL` / `REDIS_URL` / `BETTER_AUTH_SECRET` 四项,**没有 `BETTER_AUTH_URL`**;同时容器以 `NODE_ENV=production` 运行。

### Better Auth 的 secure 判定链

`src/lib/auth.ts` 未显式配置 Cookie 安全属性,触发 better-auth 的默认判定(摘自 `better-auth/dist/cookies/index.mjs`):

```js
secureCookiePrefix =
  advanced.useSecureCookies !== undefined ? advanced.useSecureCookies   // ① 显式设置,优先级最高
  : dynamicProtocol === "https" ? true                                  // ② baseURL 是动态对象时看协议
  : dynamicProtocol === "http"  ? false
  : baseURLString ? baseURLString.startsWith("https://")                // ③ baseURL 是字符串时看协议
  : isProduction                                                        // ④ 都没有 → 看 NODE_ENV
    ? SECURE_COOKIE_PREFIX : "";
```

远程环境命中 **④**:`BETTER_AUTH_URL` 未设(baseURL 非字符串)+ `NODE_ENV=production` → 加 `__Secure-` 前缀,且 Cookie 属性带 `secure: true`。本地开发环境 `NODE_ENV=development` 走 else 分支,无前缀,所以本地一直正常。

### 浏览器侧的丢弃规则

Chrome 对 `__Secure-` 前缀 Cookie 有硬性约束:**必须由 HTTPS 连接下发**,否则直接忽略,不存入 Cookie jar,也不报错。Caddy 反代只是原样转发 `Set-Cookie` 头,无从干预;应用侧拿到的请求又不含 Cookie,守卫自然判定未登录。

## 知识点解释

### 1. Cookie 的 `Secure` 属性与 `__Secure-` / `__Host-` 前缀

Cookie 本身是明文存储、随请求自动携带的,浏览器通过属性提供安全约束:

| 属性/前缀 | 含义 |
| --- | --- |
| `Secure` | 告诉浏览器:该 Cookie 只能经 HTTPS 传输。但在**非安全源(HTTP)下浏览器不会拒绝存储**——只保护传输层,保护不了在 HTTP 下发放的场景本身。 |
| `__Secure-` 前缀 | 写在 Cookie 名开头(如 `__Secure-better-auth.session_token`)。浏览器对它执行**更严的硬约束**:必须来自 HTTPS 且带 `Secure` 属性,否则整个 Cookie 被静默丢弃。目的是防中间人降级攻击——攻击者无法从 HTTP 页面注入同名 Cookie 覆盖安全 Cookie。 |
| `__Host-` 前缀 | 更严:除 HTTPS 外还必须 `Path=/`、无 `Domain` 属性,即只对当前精确主机生效,防子域污染。 |

关键区别:`Secure` 属性只是传输约束,而**前缀是准入约束**。在 HTTP 站点上,一个带 `Secure` 属性的普通 Cookie 仍可能被存储(视浏览器策略),但 `__Secure-` 前缀的 Cookie 是**百分之百被丢弃**的。这就是本事故的机制:会话创建了、Cookie 下发了,但浏览器从未收下。

### 2. `BETTER_AUTH_URL` 环境变量

`BETTER_AUTH_URL` 是 Better Auth 确定 **baseURL** 的环境变量,baseURL 在框架内承担多个职责:

1. **Cookie 安全属性判定**(本事故的直接触发点):baseURL 是 `http://` 字符串 → 不加 `__Secure-` 前缀、不带 `Secure` 属性;是 `https://` → 加;**缺失** → 回退到 `NODE_ENV === "production"` 判定。生产容器未设该变量时,HTTP 部署必然踩坑。
2. **trustedOrigins 合成**:`src/lib/auth.ts` 以 `process.env.BETTER_AUTH_URL ?? "http://localhost:3000"` 构建 CSRF 源白名单。未设时白名单与真实访问源不一致——本次侥幸未触发拒绝(baseURL 动态推断兜底),但属于隐性地雷。
3. **OAuth 回调等绝对地址拼接**(本产品暂未用到,部署 HTTPS 后会用到)。

**部署纪律结论**:`BETTER_AUTH_URL` 应与「用户实际访问的协议+主机(+端口)」严格一致,作为部署必备项而非可选优化。HTTP 部署设为 `http://<ip/域名>`;上了 HTTPS 域名后改为 `https://<域名>`。

## 修复方案与验证

**修复**(仅环境配置,零代码改动):在 `/opt/studybuddy/.env` 追加

```dotenv
BETTER_AUTH_URL=http://106.55.48.38
```

随后 `docker compose -p studybuddy-dev up -d --wait` 重建 app 容器使 env_file 生效。

**验证**:

- curl 直连 sign-in 端点:`Set-Cookie` 已变为 `better-auth.session_token`(无 `__Secure-` 前缀、无 `Secure` 属性),与 HTTP 环境匹配;
- Playwright 走完整浏览器流程:登录 → 跳转 `/workbench`,刷新后会话保持。

## 遗留风险与后续动作

| 项 | 说明 | 建议动作 |
| --- | --- | --- |
| test 环境共享 `.env`(中风险) | `/opt/studybuddy/.env` 被 dev(:80)与 test(:8080)两个 compose project 共享。test 栈下次部署会读到 `BETTER_AUTH_URL=http://106.55.48.38`,其真实访问源 `http://106.55.48.38:8080` 与 trustedOrigins 不匹配,登录 POST 将被 CSRF 校验拒绝(403) | 按 project 拆分 env 文件,或在代码层放宽 `trustedOrigins`(改产品代码,须走 TDD 流程与设计门禁) |
| 部署脚本无该项预检 | `scripts/deploy.sh` 的机密预检只查 `POSTGRES_PASSWORD`,不校验 `BETTER_AUTH_URL`,同类问题仍可能复发 | 在预检中增加 `BETTER_AUTH_URL` 非空校验(可与上项合并处理) |
| 测试数据残留 | 远程 dev 库留有本次排查注册的测试账号 `remote_probe`(密码 `probe1234`) | 确认无观察价值后删除 |

## 经验教训

1. **「接口 200」不等于「登录成功」**:凭据类流程的端到端验证必须包含 Cookie 是否被浏览器接收、受保护页守卫是否放行,抓 `Set-Cookie` 是最短路径。
2. **环境差异先看协议与 NODE_ENV**:本地正常、远程异常时,优先对比 `NODE_ENV`、访问协议、反代头,这类组合会触发框架的安全默认值。
3. **安全默认值是双刃剑**:框架在生产环境默认启用最安全的 Cookie 形态是好设计,但 HTTP 部署(含内网/测试环境)必须显式声明 baseURL 才能获得正确的降级。
4. **共享 env 文件是多环境部署的常见事故源**:两个 compose project 共居一台服务器时,任何按环境变化的变量(URL、端口、回源地址)都应按 project 隔离。

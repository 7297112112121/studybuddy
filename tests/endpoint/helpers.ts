/**
 * 接口测试共享 helper（端点直调基座）。造号唯一实现已上收
 * tests/support/username（跨轨共享件唯一实现,归 e2e 测试纪律共享基座），本文件
 * 只留认证直调基座。
 */

import { auth } from "@/auth/better-auth.server";

/**
 * auth.handler 直调请求基座（不经 HTTP 层），URL 锚定 basePath
 * '/api/auth'（Better Auth 默认）与 BETTER_AUTH_URL 同源。携 cookie
 * 的请求会触发 originCheckMiddleware 的 CSRF 校验（useCookies=true 时
 * 强制校验 origin），故此时补受信任 origin 头；未携 cookie 时该中间件
 * 短路（validateOrigin 对无 cookie 请求直接放行）。
 */
function authRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  cookie?: string,
): Request {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const headers: Record<string, string> = {};
  if (method === "POST") {
    headers["content-type"] = "application/json";
  }
  if (cookie) {
    headers.cookie = cookie;
    headers.origin = base;
  }
  return new Request(`${base}/api/auth${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

/** 直调 auth.handler 的 POST 基座（Task 6，design「Produces」directPost）。 */
export async function directPost(
  path: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  return auth.handler(authRequest("POST", path, body, cookie));
}

/** 直调 auth.handler 的 GET 基座（get-session 语义为 GET）。 */
export async function directGet(
  path: string,
  cookie?: string,
): Promise<Response> {
  return auth.handler(authRequest("GET", path, undefined, cookie));
}

/**
 * 正确密码登录并返回 set-cookie 头值（Task 6，design「Produces」）。
 *
 * 供携 cookie 直调受保护端点复用（Task 7 沿用）；set-cookie 属性段
 * （Path/HttpOnly 等）随 Cookie 头回传时被 better-call 的 cookie 解析
 * 忽略，不影响会话识别。
 */
export async function signInAndGetCookie(
  username: string,
  password: string,
): Promise<string> {
  const res = await directPost("/sign-in/username", {
    username,
    password,
  });
  if (!res.ok) {
    throw new Error(`signInAndGetCookie: 登录失败，status=${res.status}`);
  }
  const cookie = res.headers.getSetCookie()[0];
  if (!cookie) {
    throw new Error("signInAndGetCookie: 响应不含 set-cookie 头");
  }
  return cookie;
}

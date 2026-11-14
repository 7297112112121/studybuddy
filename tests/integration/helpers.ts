/**
 * 集成测试共享 helper（Task 5 起步，Task 6 增端点辅助）。
 */

import { auth } from "@/lib/auth";

let uniquePhoneSeq = 0;

/**
 * 每次调用返回不重复的合法手机号（^1[3-9]\d{9}$）。
 *
 * user_phone_number 唯一索引跨测试运行持久化（compose 卷）——时间戳主干
 * 保证跨运行不重复，末位计数器保证同毫秒内并发/连续调用不重复，配合
 * Playwright workers:1 与 throttleSignIn 节流，从源头防唯一冲突串扰
 * 与内置登录限流（specialRule 3 次/10 秒，见 tasks.md Task 12 裁决）429。
 */
/**
 * 直调 auth.handler 的 POST 基座（Task 6，design「Produces」directPost）。
 *
 * 构造 Request 直调 betterAuth handler（不经 HTTP 层），URL 锚定
 * basePath '/api/auth'（Better Auth 默认）与 BETTER_AUTH_URL 同源。
 * 携 cookie 的 POST 会触发 originCheckMiddleware 的 CSRF 校验
 * （useCookies=true 时强制校验 origin），故此时补受信任 origin 头；
 * 未携 cookie 时该中间件短路（validateOrigin 对无 cookie 请求直接放行）。
 */
export async function directPost(
  path: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) {
    headers.cookie = cookie;
    headers.origin = base;
  }
  return auth.handler(
    new Request(`${base}/api/auth${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

/**
 * 正确密码登录并返回 set-cookie 头值（Task 6，design「Produces」）。
 *
 * 供携 cookie 直调受保护端点复用（Task 7 沿用）；set-cookie 属性段
 * （Path/HttpOnly 等）随 Cookie 头回传时被 better-call 的 cookie 解析
 * 忽略，不影响会话识别。
 */
export async function signInAndGetCookie(
  phone: string,
  password: string,
): Promise<string> {
  const res = await directPost("/sign-in/phone-number", {
    phoneNumber: phone,
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

export function uniquePhone(): string {
  uniquePhoneSeq = (uniquePhoneSeq + 1) % 10;
  const stem = String(Date.now()).slice(-8).padStart(8, "0");
  const head = 3 + (uniquePhoneSeq % 7); // 3..9，落在 PHONE_RE 合法域
  return `1${head}${stem}${uniquePhoneSeq}`;
}

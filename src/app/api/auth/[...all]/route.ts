/**
 * Better Auth 全部认证端点挂载（design「路由层薄壳」）：
 * 含 /sign-in/phone-number、/sign-out 等；/sign-up/email 与 /sign-in/email
 * 被 lib/auth.ts 的 before-hook 以 403 拦死（非目标 #4）。
 *
 * Route Handler 约定（Next.js 16.4.6，node_modules/next/dist/docs/
 * 01-app/01-getting-started/15-route-handlers.md）：GET/POST 等命名导出，
 * 默认不缓存。方法集合由 toNextJsHandler 全量导出（GET/POST/PATCH/PUT/DELETE），
 * 未命名捕获段 [...all] 承接 Better Auth 的全部端点路径。
 */
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth.handler);

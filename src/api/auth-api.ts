/**
 * 认证域统一接口端点词汇:注册端点(POST /api/auth/register)的请求体组装
 * 与契约结果类型;登录/登出走 Better Auth 托管端点(authClient),不经统一
 * 接口,不在收编范围。
 */
import type { z } from "zod";

import { requestContractResult } from "@/api/request";
import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import type { ApiErrorCode, ApiResult } from "@/common/error";
import { registerFormSchema } from "@/validation/auth-validators";

/** 注册端点契约结果:公共技术码之外含认证域码(账户名已存在)。 */
export type RegisterApiResult = ApiResult<
  undefined,
  ApiErrorCode | typeof USERNAME_ALREADY_REGISTERED
>;

/** 注册端点:请求体与注册表单 schema(registerFormSchema)同形,调用侧已过提交门,此处不重复校验。 */
export function registerAccount(
  input: z.infer<typeof registerFormSchema>,
): Promise<RegisterApiResult> {
  return requestContractResult("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

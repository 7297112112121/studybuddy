/**
 * 注册端点:公开端点走无会话契约切面,复用 registerWithUsername 写路径;
 * 账户名唯一冲突(23505)由 service 抛契约化错误(ApiError),切面归一传输
 * (HTTP 409)。响应体即接口契约结果(ApiResult)形态,判别以 body 为准。
 */
import { respondWith, withSessionlessApiContract } from "@/app/api/contract";
import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import { registerWithUsername } from "@/auth/service";
import { registerFormSchema } from "@/validation/auth-validators";
import { type ApiErrorCode, type ApiResult } from "@/common/error";

export type RegisterApiResult = ApiResult<
  undefined,
  ApiErrorCode | typeof USERNAME_ALREADY_REGISTERED
>;

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await withSessionlessApiContract(
    body,
    registerFormSchema,
    (input) =>
      registerWithUsername({
        username: input.username,
        password: input.password,
      }),
  );
  return respondWith(result);
}

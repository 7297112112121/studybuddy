/**
 * 注册端点:自写 POST 端点,复用 registerWithUsername 写路径。
 * 响应即接口契约结果(ApiResult)形态;判别以 body 为准,
 * HTTP 状态码仅传输语义。错误域独立于日历等技术错误码,含账户名已被注册。
 */
import { NextResponse } from "next/server";

import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import { registerWithUsername } from "@/auth/service";
import {
  validateRegisterForm,
  type RegisterFormErrors,
  type RegisterInput,
} from "@/auth/validators";

export type RegisterApiResult =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: RegisterFormErrors }
  | { ok: false; error: typeof USERNAME_ALREADY_REGISTERED };

export async function POST(request: Request): Promise<Response> {
  let input: RegisterInput | null = null;
  try {
    input = (await request.json()) as RegisterInput;
  } catch {
    input = null;
  }
  if (input === null || typeof input !== "object") {
    return NextResponse.json<RegisterApiResult>(
      { ok: false, error: "INVALID_INPUT", fieldErrors: {} },
      { status: 400 },
    );
  }

  // 表单级规则任一不过即返回 INVALID_INPUT（不触达 db）；
  // 账户名唯一冲突（23505）→ USERNAME_ALREADY_REGISTERED 透传。
  const fieldErrors = validateRegisterForm(input);
  if (fieldErrors !== null) {
    return NextResponse.json<RegisterApiResult>(
      { ok: false, error: "INVALID_INPUT", fieldErrors },
      { status: 400 },
    );
  }

  const outcome = await registerWithUsername({
    username: input.username,
    password: input.password,
  });
  if (!outcome.ok) {
    return NextResponse.json<RegisterApiResult>(
      { ok: false, error: "USERNAME_ALREADY_REGISTERED" },
      { status: 409 },
    );
  }
  return NextResponse.json<RegisterApiResult>({ ok: true });
}

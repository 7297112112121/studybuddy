"use server";

/**
 * 认证域写路径 action（design「modules/auth/actions.ts」契约，Task 7）。
 *
 * registerAction 是注册表单的服务端入口（ADR-0025 判别联合返回）：
 * zod 复验（边界 #1 后端半边）→ registerWithPhone 事务。R13 纪律：
 * 本文件及调用链不记录任何入参（含密码与手机号）。
 *
 * 'use server' 文件仅可导出 async 函数；RegisterActionResult 为纯类型
 * 导出（编译期擦除，不产生运行时导出），不触发该约束。
 */
import type { ZodError } from "zod";

import { registerInputSchema } from "./schema";
import type { RegisterInput } from "./schema";
import { registerWithPhone } from "./service";
import type { RegisterFormErrors } from "./validators";

export type RegisterActionResult =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: RegisterFormErrors }
  | { ok: false; error: "PHONE_ALREADY_REGISTERED" };

/**
 * 单个 zod issue → 表单字段错误：按 registerInputSchema 的字段路径归位到
 * RegisterFormErrors 的 key（与客户端 validateRegisterForm 文案 key 一致）。
 * - 空 path（顶层 refine：password === confirmPassword）→ confirmPassword 不一致；
 * - phone 正则不过 → phoneInvalid；
 * - password 依原始入参区分空值（required）与格式不合格（invalid）；
 * - confirmPassword 路径 → 不一致；agreementAccepted 非 true → agreement.required。
 */
function issueToFieldErrors(
  issue: ZodError["issues"][number],
  rawPassword: unknown,
): RegisterFormErrors {
  if (issue.path.length === 0) {
    return { confirmPassword: "auth.register.passwordMismatch" };
  }
  switch (issue.path[0]) {
    case "phone":
      return { phone: "auth.register.phoneInvalid" };
    case "password":
      return {
        password:
          rawPassword === "" || rawPassword == null
            ? "auth.password.required"
            : "auth.password.invalid",
      };
    case "confirmPassword":
      return { confirmPassword: "auth.register.passwordMismatch" };
    case "agreementAccepted":
      return { agreement: "auth.agreement.required" };
    default:
      return {};
  }
}

function toFieldErrors(input: RegisterInput, error: ZodError): RegisterFormErrors {
  const rawPassword = (input as { password?: unknown }).password;
  const fieldErrors: RegisterFormErrors = {};
  for (const issue of error.issues) {
    Object.assign(fieldErrors, issueToFieldErrors(issue, rawPassword));
  }
  return fieldErrors;
}

/** zod 复验不过返回 INVALID_INPUT（不触达 db）；23505 → PHONE_ALREADY_REGISTERED 透传 */
export async function registerAction(
  input: RegisterInput,
): Promise<RegisterActionResult> {
  const parsed = registerInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: toFieldErrors(input, parsed.error),
    };
  }

  const outcome = await registerWithPhone({
    phone: parsed.data.phone,
    password: parsed.data.password,
  });
  if (!outcome.ok) {
    return { ok: false, error: "PHONE_ALREADY_REGISTERED" };
  }
  return { ok: true };
}

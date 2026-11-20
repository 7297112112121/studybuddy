"use server";

/**
 * 认证域写路径 action（design「modules/auth/actions.ts」契约，Task 7）。
 */
import { registerWithUsername } from "./service";
import type { RegisterFormErrors, RegisterInput } from "./validators";
import { validateRegisterForm } from "./validators";

export type RegisterActionResult =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: RegisterFormErrors }
  | { ok: false; error: "USERNAME_ALREADY_REGISTERED" };

/** 表单级规则任一不过即返回 INVALID_INPUT（不触达 db）；账户名唯一冲突（23505）→ USERNAME_ALREADY_REGISTERED 透传 */
export async function registerAction(
  input: RegisterInput,
): Promise<RegisterActionResult> {
  const fieldErrors = validateRegisterForm(input);
  if (fieldErrors !== null) {
    return { ok: false, error: "INVALID_INPUT", fieldErrors };
  }

  const outcome = await registerWithUsername({
    username: input.username,
    password: input.password,
  });
  if (!outcome.ok) {
    return { ok: false, error: "USERNAME_ALREADY_REGISTERED" };
  }
  return { ok: true };
}

/**
 * 登录/注册表单校验纯函数。零 IO、零副作用，仅依赖传入字符串。
 * 校验正则为全仓单一来源（R2/R3），值逐字符固定，勿在此处改动。
 */

export const PHONE_RE = /^1[3-9]\d{9}$/;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;

export type AccountKind = "phone" | "email";

export type AccountCheck =
  | { ok: true; kind: AccountKind }
  | { ok: false; messageKey: "auth.account.required" | "auth.account.invalid" };

export function validateAccount(raw: string): AccountCheck {
  if (raw === "") {
    return { ok: false, messageKey: "auth.account.required" };
  }
  if (PHONE_RE.test(raw)) {
    return { ok: true, kind: "phone" };
  }
  if (EMAIL_RE.test(raw)) {
    return { ok: true, kind: "email" };
  }
  return { ok: false, messageKey: "auth.account.invalid" };
}

export function validatePassword(raw: string): {
  ok: true;
} | {
  ok: false;
  messageKey: "auth.password.required" | "auth.password.invalid";
} {
  if (raw === "") {
    return { ok: false, messageKey: "auth.password.required" };
  }
  if (!PASSWORD_RE.test(raw)) {
    return { ok: false, messageKey: "auth.password.invalid" };
  }
  return { ok: true };
}

export type RegisterFormErrors = Partial<{
  phone: "auth.register.phoneInvalid";
  password: "auth.password.required" | "auth.password.invalid";
  confirmPassword: "auth.register.passwordMismatch";
  agreement: "auth.agreement.required";
}>;

export function validateRegisterForm(v: {
  phone: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
}): RegisterFormErrors | null {
  const errors: RegisterFormErrors = {};

  if (!PHONE_RE.test(v.phone)) {
    errors.phone = "auth.register.phoneInvalid";
  }

  const passwordCheck = validatePassword(v.password);
  if (!passwordCheck.ok) {
    errors.password = passwordCheck.messageKey;
  } else if (v.confirmPassword === "" || v.confirmPassword !== v.password) {
    // R8：确认密码为空与不一致同归「两次输入的密码不一致」。
    // 仅在密码自身校验通过时检查——确认密码的强度由「与 password 一致」
    // 间接保证，密码为空/不合格时不再叠加 confirmPassword 错误。
    errors.confirmPassword = "auth.register.passwordMismatch";
  }

  if (!v.agreementAccepted) {
    errors.agreement = "auth.agreement.required";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

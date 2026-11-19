/**
 * 登录/注册表单校验纯函数。零 IO、零副作用，仅依赖传入字符串。
 * USERNAME_RE 真源在 @/lib/username（依赖方向：lib 不得反向 import
 * modules，故真源上浮轻量 lib 文件，此处 re-export 保持既有导入路径）；
 * PASSWORD_RE 为密码域单一来源（R3/F-02），值逐字符固定，勿在此处改动。
 */
import { USERNAME_RE } from "@/lib/username";

export { USERNAME_RE };

/**
 * 账户名字符集（无长度量词）——仅供规则浮层做「字符集/长度」两条正交
 * 拆解；字符类括号表达式必须与 USERNAME_RE 逐字符一致（长度仅由
 * USERNAME_RE 的量词单一约束），改动任一处须同步。
 */
const USERNAME_CHARSET_RE = /^[一-龥A-Za-z0-9_]+$/;

export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;

export type AccountCheck =
  | { ok: true }
  | { ok: false; messageKey: "auth.account.required" | "auth.account.invalid" };

export function validateAccount(raw: string): AccountCheck {
  if (raw === "") {
    return { ok: false, messageKey: "auth.account.required" };
  }
  if (!USERNAME_RE.test(raw)) {
    return { ok: false, messageKey: "auth.account.invalid" };
  }
  return { ok: true };
}

export function validatePassword(raw: string):
  | {
      ok: true;
    }
  | {
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

/**
 * 字段规则清单项（AXY-8 UI 优化：聚焦浮层实时侦测）。label 为页面静态
 * 文案（与 AccountField 的 Label/hint 同约定，不入 auth.json）。
 */
export type FieldRuleState = {
  label: string;
  passed: boolean;
};

/** 字母与数字同时存在（PASSWORD_RE 两段 look-ahead 的同源拆解）。 */
const PASSWORD_MIX_RE = /^(?=.*[A-Za-z])(?=.*\d)/;

/**
 * 账户名规则实时拆解。不变量：每条 passed 全真 ⇔ validateAccount.ok
 * （required 除外——空值时两条均为 false，由 required 文案兜底）。
 * 正则为全仓单一来源，勿在此处另写规则。
 */
export function accountRuleStates(raw: string): FieldRuleState[] {
  return [
    { label: "长度 1—16 个字符", passed: raw.length >= 1 && raw.length <= 16 },
    {
      label: "仅含中文、字母、数字或下划线",
      passed: USERNAME_CHARSET_RE.test(raw),
    },
  ];
}

/** 密码规则实时拆解。不变量：每条 passed 全真 ⇔ validatePassword.ok（required 除外）。 */
export function passwordRuleStates(raw: string): FieldRuleState[] {
  return [
    { label: "长度 8—20 位", passed: raw.length >= 8 && raw.length <= 20 },
    { label: "需同时含字母与数字", passed: PASSWORD_MIX_RE.test(raw) },
  ];
}

export type RegisterFormErrors = Partial<{
  username: "auth.account.invalid";
  password: "auth.password.required" | "auth.password.invalid";
  confirmPassword: "auth.register.passwordMismatch";
  agreement: "auth.agreement.required";
}>;

export function validateRegisterForm(v: {
  username: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
}): RegisterFormErrors | null {
  const errors: RegisterFormErrors = {};

  if (!USERNAME_RE.test(v.username)) {
    errors.username = "auth.account.invalid";
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

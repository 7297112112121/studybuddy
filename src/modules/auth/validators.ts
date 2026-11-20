/**
 * 登录/注册表单校验纯函数，账户名与密码业务规则的唯一来源。
 * 规则界限禁止在本文件之外复写字面值，消费方一律引用本文件导出的常量、正则与类型。
 */

/** 账户名长度下界：最短字符数，正则量词、规则浮层与 Better Auth 插件配置同源引用。 */
export const USERNAME_MIN_LENGTH = 1;

/** 账户名长度上界：最长字符数，同源引用范围同下界。 */
export const USERNAME_MAX_LENGTH = 16;

/** 密码长度下界：最短位数，正则量词、规则浮层与 Better Auth 配置同源引用。 */
export const PASSWORD_MIN_LENGTH = 8;

/** 密码长度上界：最长位数，同源引用范围同下界。 */
export const PASSWORD_MAX_LENGTH = 20;

/** 账户名合法域：中文/字母/数字/下划线，长度界限由上述常量注入（区分大小写；输入不过滤）。 */
export const USERNAME_RE = new RegExp(
  `^[一-龥A-Za-z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`,
);

/**
 * 账户名字符集（无长度量词）——仅供规则浮层做「字符集/长度」两条正交
 * 拆解；字符类括号表达式必须与 USERNAME_RE 逐字符一致（长度仅由
 * USERNAME_RE 的量词单一约束），改动任一处须同步。
 */
const USERNAME_CHARSET_RE = /^[一-龥A-Za-z0-9_]+$/;

/** 密码域：字母与数字同时存在，长度界限由上述常量注入。 */
export const PASSWORD_RE = new RegExp(
  `^(?=.*[A-Za-z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
);

/**
 * 校验错误承载的 messageKey 全集（与上方校验函数的返回键一一对应）。
 * 显式枚举而非推断，键清单变更时在此同步；账户名无独立注册键，
 * 登录/注册复用 auth.account.* 文案组。
 */
export type AuthMessageKey =
  | "auth.account.required"
  | "auth.account.invalid"
  | "auth.password.required"
  | "auth.password.invalid"
  | "auth.register.passwordMismatch"
  | "auth.agreement.required";

/** 字段错误状态：协议勾选错误单列，其余以字段级文案呈现在各输入框下。 */
export type AuthFormErrors = Partial<
  Record<
    "account" | "username" | "password" | "confirmPassword" | "agreement",
    AuthMessageKey
  >
>;

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
    {
      label: `长度 ${USERNAME_MIN_LENGTH}—${USERNAME_MAX_LENGTH} 个字符`,
      passed:
        raw.length >= USERNAME_MIN_LENGTH && raw.length <= USERNAME_MAX_LENGTH,
    },
    {
      label: "仅含中文、字母、数字或下划线",
      passed: USERNAME_CHARSET_RE.test(raw),
    },
  ];
}

/** 密码规则实时拆解。不变量：每条 passed 全真 ⇔ validatePassword.ok（required 除外）。 */
export function passwordRuleStates(raw: string): FieldRuleState[] {
  return [
    {
      label: `长度 ${PASSWORD_MIN_LENGTH}—${PASSWORD_MAX_LENGTH} 位`,
      passed:
        raw.length >= PASSWORD_MIN_LENGTH && raw.length <= PASSWORD_MAX_LENGTH,
    },
    { label: "需同时含字母与数字", passed: PASSWORD_MIX_RE.test(raw) },
  ];
}

/**
 * 确认密码规则实时拆解。不变量：passed 等价于「非空且与 password 一致」，
 * 与 validateRegisterForm 的确认密码判定同语义（空值视为不一致）。
 */
export function confirmPasswordRuleStates(
  password: string,
  confirmPassword: string,
): FieldRuleState[] {
  return [
    {
      label: "与第一次输入一致",
      passed: confirmPassword !== "" && confirmPassword === password,
    },
  ];
}

export type RegisterFormErrors = Partial<{
  username: "auth.account.invalid";
  password: "auth.password.required" | "auth.password.invalid";
  confirmPassword: "auth.register.passwordMismatch";
  agreement: "auth.agreement.required";
}>;

/** 注册入参类型契约（传输层形状），validateRegisterForm 与服务端 action 共用。 */
export type RegisterInput = {
  username: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

export function validateRegisterForm(
  v: RegisterInput,
): RegisterFormErrors | null {
  const errors: RegisterFormErrors = {};

  if (!USERNAME_RE.test(v.username)) {
    errors.username = "auth.account.invalid";
  }

  const passwordCheck = validatePassword(v.password);
  if (!passwordCheck.ok) {
    errors.password = passwordCheck.messageKey;
  } else if (v.confirmPassword === "" || v.confirmPassword !== v.password) {
    errors.confirmPassword = "auth.register.passwordMismatch";
  }

  if (!v.agreementAccepted) {
    errors.agreement = "auth.agreement.required";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

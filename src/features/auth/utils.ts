/**
 * 认证域纯计算工具:字段规则浮层的实时拆解(无 React、无状态、无 JSX)。
 * 规则界限与正则单一来源在 src/validation/auth,此处只做按条拆解呈现;
 * 不变量:每条 passed 全真 ⇔ 表单 schema 对应字段通过(必填 required 除外)。
 */
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/validation/auth";

/**
 * 字段规则清单项（AXY-8 UI 优化：聚焦浮层实时侦测）。
 * label 为页面静态文案（与 AccountField 的 Label/hint 同约定，不入 auth.json）。
 */
export type FieldRuleState = {
  label: string;
  passed: boolean;
};

/**
 * 账户名字符集（无长度量词）——仅供规则浮层做「字符集/长度」两条正交
 * 拆解；字符类括号表达式必须与 USERNAME_RE 逐字符一致（长度仅由
 * USERNAME_RE 的量词单一约束），改动任一处须同步。
 */
const USERNAME_CHARSET_RE = /^[一-龥A-Za-z0-9_]+$/;

/** 字母与数字同时存在（PASSWORD_RE 两段 look-ahead 的同源拆解）。 */
const PASSWORD_MIX_RE = /^(?=.*[A-Za-z])(?=.*\d)/;

/**
 * 账户名规则实时拆解。不变量：每条 passed 全真 ⇔ 登录表单 schema(loginFormSchema)
 * 通过（required 除外——空值时两条均为 false，由必填(required)文案兜底）。
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

/** 密码规则实时拆解。不变量：每条 passed 全真 ⇔ 登录表单 schema(loginFormSchema) 通过（必填(required)除外）。 */
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
 * 与注册表单 schema(registerFormSchema)的确认密码判定同语义（空值视为不一致）。
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

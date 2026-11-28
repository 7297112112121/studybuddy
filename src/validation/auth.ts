/**
 * 账户域校验规则单一真源:账户名与密码长度界限、正则;界限同源注入正则
 * 量词、规则浮层与 Better Auth 插件配置,wire 契约(schema)落
 * src/app/api/auth/request。
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

/** 密码域：字母与数字同时存在，长度界限由上述常量注入。 */
export const PASSWORD_RE = new RegExp(
  `^(?=.*[A-Za-z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
);

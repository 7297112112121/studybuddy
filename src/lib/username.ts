/**
 * src/lib/username.ts——账户名合法域单一来源（F-01）。
 *
 * 账户名规则属产品知识，但依赖方向单向（modules → lib，lib 不得反向
 * import modules）：真源落 lib 轻量文件供上下两层共用——lib/auth.ts
 * （插件 usernameValidator）与 modules/auth/validators.ts（表单/schema
 * 校验，经 re-export 保持既有导入路径）。值逐字符固定（R2/F-01），
 * 改动须走需求流程，不得在此处顺手调整。
 */

/** 账户名合法域：中文/字母/数字/下划线，1–16 字符（F-01，区分大小写；输入不过滤）。 */
export const USERNAME_RE = /^[一-龥A-Za-z0-9_]{1,16}$/;

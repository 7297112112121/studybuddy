/**
 * 登录错误 → R7 统一文案 key 映射（design「modules/auth/errors.ts」契约）。
 *
 * client-safe：仅纯函数 + 类型，可被客户端组件直接 import。
 * 映射表依据 design 开放问题 #1 闭合记录（Task 6 实测）：
 * - 三失败情形（未注册/错密码/空密码直连）均为 401 + INVALID_USERNAME_OR_PASSWORD
 *   （/sign-in/username 原生码族）→ invalidCredentials；
 * - 400 为入参格式拒绝（格式拒绝同属「账号或密码不对」文案域，不泄露探测面）
 *   → invalidCredentials；
 * - 429 限流 → tooManyAttempts；
 * - 其余（5xx、网络层归一后的空值）→ unknown。
 */
export type SignInErrorKey =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown";

/**
 * 屏顶部错误键（auth.error.* 文案命名空间）：登录失败经 mapSignInError
 * 归一；注册账户名已存在固定为 usernameRegistered（文案整体可点，
 * 切回登录视图并带入账户名）。
 */
export type AuthTopError = SignInErrorKey | "auth.error.usernameRegistered";

/** err 形状兼容 better-auth 客户端错误对象（status 可选），空值兜底 unknown */
export function mapSignInError(
  err: { status?: number } | null | undefined,
): SignInErrorKey {
  if (!err) {
    return "auth.error.unknown";
  }
  if (err.status === 429) {
    return "auth.error.tooManyAttempts";
  }
  if (err.status === 401 || err.status === 400) {
    return "auth.error.invalidCredentials";
  }
  return "auth.error.unknown";
}

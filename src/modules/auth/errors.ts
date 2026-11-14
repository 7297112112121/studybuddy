/**
 * 登录错误 → R7 统一文案 key 映射（design「modules/auth/errors.ts」契约）。
 *
 * client-safe：仅纯函数 + 类型，可被客户端组件直接 import。
 * 映射表依据 design 开放问题 #1 闭合记录（Task 6 实测）：
 * - 三失败情形（未注册/错密码/空密码直连）均为 401 + INVALID_PHONE_NUMBER_OR_PASSWORD
 *   → invalidCredentials（同族 username 插件行为一致）；
 * - 400 为入参格式拒绝（格式拒绝同属「账号或密码不对」文案域，不泄露探测面）
 *   → invalidCredentials；
 * - 429 限流 → tooManyAttempts；
 * - 其余（5xx、网络层归一后的空值）→ unknown。
 */
export type SignInErrorKey =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown";

/** err 形状兼容 better-auth 客户端错误对象（status/code 均可选），空值兜底 unknown */
export function mapSignInError(
  err: { status?: number; code?: string } | null | undefined,
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

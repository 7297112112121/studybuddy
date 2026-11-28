/**
 * 文件作用:认证技术报错——域码与 better-auth 客户端错误形态的唯一适配点
 * (feature 层禁止直接解读裸 { status } 对象,只消费此处折算的文案键)。
 */

/** 注册唯一冲突：账户名/占位邮箱 unique 约束（23505）触发——service 判定、注册端点透传（HTTP 409）、客户端映射为账户名已存在文案。 */
export const USERNAME_ALREADY_REGISTERED = "USERNAME_ALREADY_REGISTERED";

/** 认证域错误码 → HTTP 状态（仅传输语义），与域码同处登记。 */
export const AUTH_ERROR_STATUS: Record<
  typeof USERNAME_ALREADY_REGISTERED,
  number
> = {
  [USERNAME_ALREADY_REGISTERED]: 409,
};

/** PG 唯一约束冲突错误码(sqlstate 23505):service 层唯一冲突判定引用。 */
export const PG_UNIQUE_VIOLATION_CODE = "23505";

/** 登录失败映射后的文案键（auth.error.* 命名空间）。 */
export type SignInErrorKey =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown";

/** 把 better-auth 客户端错误对象（status 可选）折算为登录文案键，空值兜底未知（unknown）。 */
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

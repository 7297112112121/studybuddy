/**
 * 认证技术层读路径
 */
import { headers } from "next/headers";

import { auth } from "./better-auth.server";

export type AuthSession = {
  user: { id: string; name: string; username: string };
  session: { id: string; userId: string; expiresAt: Date };
};

/** Better Auth getSession 原始载荷类型(toAuthSession 入参与单测构造共用)。 */
type RawSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * 纯映射:原始载荷 → AuthSession 的字段拣选与归一,null 透传。
 * username 可空归一空串(Better Auth 类型标可空,注册路径恒有值);
 * expiresAt 归一 Date 实例。
 */
export function toAuthSession(raw: RawSession): AuthSession | null {
  if (!raw) {
    return null;
  }
  return {
    user: {
      id: raw.user.id,
      name: raw.user.name,
      username: raw.user.username ?? "",
    },
    session: {
      id: raw.session.id,
      userId: raw.session.userId,
      expiresAt: new Date(raw.session.expiresAt),
    },
  };
}

/** 未登录返回 null;查询异常向上抛;本函数不记录任何请求 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const headersList = await headers();
  return toAuthSession(await auth.api.getSession({ headers: headersList }));
}

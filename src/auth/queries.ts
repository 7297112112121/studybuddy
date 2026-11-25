/**
 * 认证技术层读路径
 */
import { headers } from "next/headers";

import { auth } from "./better-auth.server";

export type AuthSession = {
  user: { id: string; name: string; username: string };
  session: { id: string; userId: string; expiresAt: Date };
};

/** 未登录返回 null;查询异常向上抛;本函数不记录任何请求内容(R13 纪律) */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const headersList = await headers();
  const raw = await auth.api.getSession({ headers: headersList });
  if (!raw) {
    return null;
  }
  return {
    user: {
      id: raw.user.id,
      name: raw.user.name,
      // Better Auth 的 user.username 类型标注可空,注册路径恒有值
      username: raw.user.username ?? "",
    },
    session: {
      id: raw.session.id,
      userId: raw.session.userId,
      expiresAt: new Date(raw.session.expiresAt),
    },
  };
}

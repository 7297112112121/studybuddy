/**
 * 认证域读路径（design「modules/auth/queries.ts」契约，Task 7）。
 *
 * getCurrentSession 是 auth.api.getSession 的 RSC 调用封装：headers() 取
 * 当前请求头（Next 16 为 async，见 node_modules/next/dist/docs/.../headers.md），
 * 会话真相只在服务端（design 状态归属节）。任何异常（请求上下文缺失、
 * 存储不可达等）归一为 null，由调用方（布局守卫）执行未登录动作；
 * expiresAt 经 new Date 归一——secondaryStorage 缓存命中时 Better Auth
 * 从 Redis JSON 反序列化，运行时可能是字符串而类型标注为 Date。
 */
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type AuthSession = {
  user: { id: string; name: string; phoneNumber: string };
  session: { id: string; userId: string; expiresAt: Date };
};

/** 未登录返回 null；本函数不记录任何请求内容（R13 纪律） */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const headersList = await headers();
    const raw = await auth.api.getSession({ headers: headersList });
    if (!raw) {
      return null;
    }
    return {
      user: {
        id: raw.user.id,
        name: raw.user.name,
        // Better Auth 的 user.phoneNumber 类型标注可空，注册路径恒有值
        phoneNumber: raw.user.phoneNumber ?? "",
      },
      session: {
        id: raw.session.id,
        userId: raw.session.userId,
        expiresAt: new Date(raw.session.expiresAt),
      },
    };
  } catch {
    return null;
  }
}

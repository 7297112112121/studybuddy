"use client";

/**
 * 首页分流客户端屏（首页薄壳的 UI 承载）：会话就绪后按登录态 replace，
 * 不留历史（与登录成功落点同形态）。双向分流无 children，与会话门
 * （SessionGate）语义不同，故独立成件、同住守卫目录。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useStore } from "better-auth/react";

import { authClient } from "@/stores/auth-client";
import { ROUTES } from "@/common/routes";

export default function HomeRedirect() {
  const { data: session, isPending } = useStore(authClient.useSession);
  const router = useRouter();

  useEffect(() => {
    if (isPending) {
      return;
    }
    router.replace(session ? ROUTES.workbench : ROUTES.login);
  }, [isPending, session, router]);

  return null;
}

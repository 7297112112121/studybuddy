"use client";

/**
 * (app) 路由组布局（数据流向评审裁决 5a：守卫客户端化）——会话经 authClient
 * （nanostores 会话 store）订阅，未登录 replace 到登录页；会话判定前不渲染
 * 受保护内容。安全边界相应落在统一接口逐端点会话校验（裁决 5a 硬约束）。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useStore } from "better-auth/react";

import { authClient } from "@/stores/auth-client";
import { ROUTES } from "@/common/routes";

export default function AppLayout(props: LayoutProps<"/">) {
  const { data: session, isPending } = useStore(authClient.useSession);
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace(ROUTES.login);
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return null;
  }
  return <>{props.children}</>;
}

"use client";

/**
 * (auth) 路由组布局（数据流向评审裁决 5a：守卫客户端化）——已登录访问经
 * AuthRedirect 回 (app)；未登录渲染认证页布局（星极光 + 促销列 + 表单位）。
 */
import { AuthRedirect, AuroraBackground, PromoColumn } from "@/features/auth";
import { useStore } from "better-auth/react";

import { authClient } from "@/stores/auth-client";

export default function AuthLayout(props: LayoutProps<"/">) {
  const { data: session, isPending } = useStore(authClient.useSession);

  if (isPending) {
    return null;
  }
  if (session) {
    return <AuthRedirect />;
  }
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <AuroraBackground />

      <div className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-2 lg:gap-10">
        <PromoColumn />
        {props.children}
      </div>
    </main>
  );
}

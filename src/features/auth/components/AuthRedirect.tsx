"use client";

/**
 * 已登录用户访问登录页时，自动跳转到工作台。
 *
 * 数据流向评审裁决 5a 守卫客户端化后，(auth) 布局随会话 store 反应式翻转：
 * 原「有历史 → router.back()」策略会在重登场景循环退栈（back 落回 /login
 * → 再次翻转 → 再 back，直至 about:blank），故统一 replace 进工作台。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/common/routes";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.workbench);
  }, [router]);

  return <div role="status">正在进入…</div>;
}

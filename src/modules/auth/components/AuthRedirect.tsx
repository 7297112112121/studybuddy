"use client";

/**
 * 已登录访问 (auth) 路由的跳转器（R12，(auth) 布局渲染）。
 *
 * 契约（design「UI 与组件」）：有来路（history.length > 1）→ router.back()
 * 回到来源页；无来路（直接打开/书签）→ router.replace(ROUTES.workbench)
 * 进工作台。组件本身只占位渲染一个 status 提示，跳转在挂载后发生。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(ROUTES.workbench);
  }, [router]);

  return <div role="status">正在进入…</div>;
}

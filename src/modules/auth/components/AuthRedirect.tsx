"use client";

/**
 * 已登录访问 (auth) 路由的跳转器（R12，(auth) 布局渲染）。
 *
 * 契约（design「UI 与组件」）：有来路 → router.back()
 * 回到来源页；无来路（直接打开/书签）→ router.replace(ROUTES.workbench)
 * 进工作台。组件本身只占位渲染一个 status 提示，跳转在挂载后发生。
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 无来路阈值取 2 而非 1（Task 12 E2E 实测）：浏览器新标签页直开任意
    // URL 时，初始 about:blank 占据一个历史槽位，首次导航后 history.length
    // 即为 2。若按 > 1 判定，「无来路」分支在任何真实浏览器中都不可达，
    // back() 会退到空白页。length <= 2 视为无可回退来源。
    if (window.history.length > 2) {
      router.back();
      return;
    }
    router.replace(ROUTES.workbench);
  }, [router]);

  return <div role="status">正在进入…</div>;
}

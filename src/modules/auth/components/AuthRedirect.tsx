"use client";

/**
 * 已登录用户访问登录页时，自动跳转到工作台
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.history.length > 2) {
      router.back();
      return;
    }
    router.replace(ROUTES.workbench);
  }, [router]);

  return <div role="status">正在进入…</div>;
}

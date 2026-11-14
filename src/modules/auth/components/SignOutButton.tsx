"use client";

/**
 * 退出登录按钮（R11/B5，(app)/workbench 占位页使用）。
 *
 * authClient.signOut() 由 Better Auth 删 Redis 键 + PG 行；按 Task 10 裁决，
 * 失败形态是 resolve `{ data: null, error }` 而非 reject——无论成功还是两种
 * 失败形态，都强制 router.replace(ROUTES.login)（design 契约总表「失败仍
 * 强制 replace」），避免失败后残留受保护视图。
 */
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    try {
      await authClient.signOut();
    } catch {
      // 失败形态之二是真 reject（网络层异常）：吞掉异常，统一走 finally 强制跳转
    } finally {
      router.replace(ROUTES.login);
    }
  }

  return (
    <button type="button" onClick={() => void handleSignOut()}>
      退出登录
    </button>
  );
}

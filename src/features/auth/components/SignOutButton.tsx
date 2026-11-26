"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/common/routes";
import { authClient } from "@/stores/auth-client";
import { Button } from "@/components/ui/button";

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
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleSignOut()}
    >
      退出登录
    </Button>
  );
}

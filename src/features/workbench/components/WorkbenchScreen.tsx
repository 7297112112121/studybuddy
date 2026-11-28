"use client";

/**
 * /workbench 承接客户端屏（design 边界 B10：工作台未实现，AXY-12 正式设计
 * 替换；数据流向评审裁决 5a）——会话经 authClient 会话 store 订阅取展示
 * 数据；未登录时 (app) 布局守卫先行承接，本屏不重复判会话。
 */
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useStore } from "better-auth/react";

import { authClient } from "@/stores/auth-client";
import { ROUTES } from "@/common/routes";

import { SignOutButton } from "@/features/auth";

export default function WorkbenchScreen() {
  const { data: session } = useStore(authClient.useSession);
  const t = useTranslations("calendar");

  if (!session) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      <h1 className="text-2xl font-bold text-foreground">工作台</h1>
      <p className="text-sm text-muted-foreground">
        当前登录：
        <span data-testid="session-account">{session.user.username}</span>
      </p>
      <SignOutButton />
      {/* AXY-22 D-06：仅新增「日程日历」入口链接，不改既有承接行为 */}
      <Link
        href={ROUTES.calendar}
        data-testid="calendar-entry"
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("entryPoint")}
      </Link>
    </main>
  );
}

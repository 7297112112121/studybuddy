/**
 * (auth) 路由组布局：挂匿名之门——已登录 replace 回工作台；未登录渲染认证页
 * 布局（星极光 + 促销列 + 表单位）。重登场景勿改回「有历史 → router.back()」，
 * 循环退栈成因见会话门（SessionGate）注释。
 */
import type { Metadata } from "next";

import { AnonymousGate } from "@/app/_guards/SessionGate";
import { ROUTES } from "@/common/routes";
import { AuroraBackground, PromoColumn } from "@/features/auth";

/**
 * 认证页对爬虫关闭索引与跟进：登录注册非公开内容，组内页面（login/register）
 * 经本布局统一继承。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout(props: LayoutProps<"/">) {
  return (
    <AnonymousGate
      fallbackTo={ROUTES.workbench}
      denied={<div role="status">正在进入…</div>}
    >
      <main className="relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
        <AuroraBackground />

        <div className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-2 lg:gap-10">
          <PromoColumn />
          {props.children}
        </div>
      </main>
    </AnonymousGate>
  );
}

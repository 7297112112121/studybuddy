/**
 * (auth) 路由组布局：挂匿名之门——已登录 replace 回工作台；未登录渲染认证页
 * 布局（星极光 + 促销列 + 表单位）。重登场景勿改回「有历史 → router.back()」，
 * 循环退栈成因见会话门（SessionGate）注释。
 */
import { AnonymousGate } from "@/app/_guards/SessionGate";
import { ROUTES } from "@/common/routes";
import { AuroraBackground, PromoColumn } from "@/features/auth";

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

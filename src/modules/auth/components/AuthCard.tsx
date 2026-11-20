/** 登录/注册屏的玻璃签名卡壳（AuthCard），卡内内容由组合层注入。 */
import type { ReactNode } from "react";

import type { AuthView } from "./AuthTabs";

type AuthCardProps = {
  view: AuthView;
  children: ReactNode;
};

export default function AuthCard(props: AuthCardProps) {
  return (
    <section className="relative order-1 lg:order-2">
      {/* 角落 aurora 吻光（aria-hidden）：垫在玻璃卡后，隔毛玻璃透出柔光。 */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 -z-10 size-40 rounded-full bg-aurora-magenta/30 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -left-10 -z-10 size-40 rounded-full bg-aurora-aqua/25 blur-2xl"
      />
      <div className="glass-card mx-auto min-h-[34.5rem] w-full max-w-md rounded-4xl border border-border p-8 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 [animation-duration:600ms] [animation-fill-mode:both] motion-reduce:animate-none">
        {/* 视图级大标题：随 view 切换文案。 */}
        <h1 className="mb-5 text-3xl font-bold tracking-tight text-foreground">
          {props.view === "login" ? "欢迎回来" : "创建你的账号"}
        </h1>
        {props.children}
      </div>
    </section>
  );
}

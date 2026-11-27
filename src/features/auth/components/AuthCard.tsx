"use client";

import { useState } from "react";

import { useAuthForm } from "../forms";
import { viewHref, type AuthView } from "../routes";
import AuthTabs from "./AuthTabs";
import AuthTitle from "./AuthTitle";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type AuthCardProps = {
  initialView: AuthView;
};

export default function AuthCard(props: AuthCardProps) {
  const form = useAuthForm();
  // 视图切换为屏内薄瞬态：URL 同步用 replaceState，不触发导航。
  const [activeView, setActiveView] = useState<AuthView>(props.initialView);

  /** 切换视图保留表单值、清空错误（含顶部错误），URL 同步但不导航。 */
  function switchView(view: AuthView): void {
    setActiveView(view);
    form.clearFeedback();
    window.history.replaceState(null, "", viewHref(view));
  }

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
        <AuthTitle view={activeView} />
        <AuthTabs active={activeView} onSwitch={switchView} />

        <div
          key={activeView}
          className="animate-in fade-in slide-in-from-bottom-2 [animation-duration:300ms] [animation-fill-mode:both] motion-reduce:animate-none"
        >
          {activeView === "login" ? (
            <LoginForm
              values={form.values}
              errors={form.errors}
              errorKey={form.topError}
              errorText={
                form.topError === null
                  ? undefined
                  : form.errorText(form.topError)
              }
              submitting={form.submitting}
              onSubmit={form.handleLoginSubmit}
              onFieldChange={form.updateValue}
              onSwitchView={switchView}
            />
          ) : (
            <RegisterForm
              values={form.values}
              errors={form.errors}
              errorKey={form.topError}
              errorText={
                form.topError === null
                  ? undefined
                  : form.errorText(form.topError)
              }
              submitting={form.submitting}
              onSubmit={form.handleRegisterSubmit}
              onFieldChange={form.updateValue}
              onSwitchView={switchView}
            />
          )}
        </div>
      </div>
    </section>
  );
}

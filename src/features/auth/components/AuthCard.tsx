"use client";

import { useClientScreen, type AuthView } from "../useClientScreen";
import AuthTabs from "./AuthTabs";
import AuthTitle from "./AuthTitle";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type AuthCardProps = {
  initialView: AuthView;
};

export default function AuthCard(props: AuthCardProps) {
  const auth = useClientScreen(props.initialView);

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
        <AuthTitle view={auth.activeView} />
        <AuthTabs active={auth.activeView} onSwitch={auth.switchView} />

        <div
          key={auth.activeView}
          className="animate-in fade-in slide-in-from-bottom-2 [animation-duration:300ms] [animation-fill-mode:both] motion-reduce:animate-none"
        >
          {auth.activeView === "login" ? (
            <LoginForm
              values={auth.values}
              errors={auth.errors}
              errorKey={auth.topError}
              errorText={
                auth.topError === null
                  ? undefined
                  : auth.errorText(auth.topError)
              }
              submitting={auth.submitting}
              onSubmit={auth.handleLoginSubmit}
              onFieldChange={auth.updateValue}
              onSwitchView={auth.switchView}
            />
          ) : (
            <RegisterForm
              values={auth.values}
              errors={auth.errors}
              errorKey={auth.topError}
              errorText={
                auth.topError === null
                  ? undefined
                  : auth.errorText(auth.topError)
              }
              submitting={auth.submitting}
              onSubmit={auth.handleRegisterSubmit}
              onFieldChange={auth.updateValue}
              onSwitchView={auth.switchView}
            />
          )}
        </div>
      </div>
    </section>
  );
}

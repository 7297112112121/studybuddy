"use client";

/** 登录/注册屏组合层：调用状态机（useClientScreen），接线卡壳、视图切换、顶部错误与两个受控表单。 */
import { useClientScreen } from "../useClientScreen";
import AuthCard from "./AuthCard";
import AuthTabs from "./AuthTabs";
import AuthTopError from "./AuthTopError";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import type { AuthView } from "./AuthTabs";

type AuthScreenProps = {
  initialView: AuthView;
};

export default function AuthScreen(props: AuthScreenProps) {
  const auth = useClientScreen(props.initialView);

  return (
    <AuthCard view={auth.activeView}>
      <AuthTabs active={auth.activeView} onSwitch={auth.switchView} />
      {auth.activeView === "login" || auth.topError === null ? null : (
        <AuthTopError
          topError={auth.topError}
          text={auth.errorText(auth.topError)}
          onSwitchToLogin={() => auth.switchView("login")}
        />
      )}

      <div
        key={auth.activeView}
        className="animate-in fade-in slide-in-from-bottom-2 [animation-duration:300ms] [animation-fill-mode:both] motion-reduce:animate-none"
      >
        {auth.activeView === "login" ? (
          <LoginForm
            account={auth.values.account}
            password={auth.values.password}
            accountInvalid={auth.isInvalid("account")}
            passwordInvalid={
              auth.isInvalid("password") ||
              auth.topError === "auth.error.invalidCredentials"
            }
            errorText={
              auth.topError === null ? undefined : auth.errorText(auth.topError)
            }
            submitting={auth.submitting}
            onSubmit={auth.handleLoginSubmit}
            onAccountChange={(value) => auth.updateValue("account", value)}
            onPasswordChange={(value) => auth.updateValue("password", value)}
            onSwitchView={auth.switchView}
          />
        ) : (
          <RegisterForm
            account={auth.values.account}
            password={auth.values.password}
            confirmPassword={auth.values.confirmPassword}
            agreementAccepted={auth.values.agreementAccepted}
            accountInvalid={auth.isInvalid("username")}
            passwordInvalid={auth.isInvalid("password")}
            confirmPasswordInvalid={auth.isInvalid("confirmPassword")}
            agreementInvalid={auth.agreementInvalid}
            submitting={auth.submitting}
            onSubmit={auth.handleRegisterSubmit}
            onAccountChange={(value) => auth.updateValue("account", value)}
            onPasswordChange={(value) => auth.updateValue("password", value)}
            onConfirmPasswordChange={(value) =>
              auth.updateValue("confirmPassword", value)
            }
            onAgreementChange={(accepted) =>
              auth.updateValue("agreementAccepted", accepted)
            }
            onSwitchView={auth.switchView}
          />
        )}
      </div>
    </AuthCard>
  );
}

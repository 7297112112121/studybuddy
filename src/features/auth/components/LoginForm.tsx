
import type { FormEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import type { AuthView } from "./AuthTabs";

type LoginFormProps = {
  account: string;
  password: string;
  accountInvalid?: boolean;
  passwordInvalid?: boolean;
  submitting: boolean;
  errorText?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  /** R16：底部「注册一个」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function LoginForm(props: LoginFormProps) {
  return (
    <form id="auth-login" noValidate onSubmit={props.onSubmit}>
      <div className="space-y-4">
        <AccountField
          id="login-account"
          value={props.account}
          invalid={props.accountInvalid}
          onChange={props.onAccountChange}
        />

        <PasswordField
          id="login-password"
          label="密码"
          value={props.password}
          invalid={props.passwordInvalid}
          autoComplete="current-password"
          placeholder="8 位以上，含字母与数字"
          onChange={props.onPasswordChange}
        />

        {props.errorText !== undefined && (
          <p role="alert" className="text-xs text-destructive">
            {props.errorText}
          </p>
        )}

        <SubmitButton
          submitting={props.submitting}
          pendingKey="submit.loggingIn"
        >
          登录
        </SubmitButton>
      </div>

      <ViewSwitchLink
        target="register"
        prefix="还没有账号？"
        onSwitch={props.onSwitchView}
      >
        注册一个
      </ViewSwitchLink>
    </form>
  );
}

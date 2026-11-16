/**
 * 登录表单（受控）。提交只走 AuthScreen 校验链：校验不过呈现错误，
 * 通过后由 AuthScreen 决定后续。D-13：登录表单无协议勾选行——协议
 * 同意留痕（R15）仅在注册侧收集。
 */
import type { FormEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import type { AuthView } from "./AuthTabs";

type LoginFormProps = {
  account: string;
  password: string;
  accountError?: string;
  passwordError?: string;
  submitting: boolean;
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
          error={props.accountError}
          onChange={props.onAccountChange}
        />

        <PasswordField
          id="login-password"
          label="密码"
          value={props.password}
          error={props.passwordError}
          autoComplete="current-password"
          placeholder="8 位以上，含字母与数字"
          onChange={props.onPasswordChange}
        />

        <SubmitButton submitting={props.submitting} pendingKey="submit.loggingIn">
          登录
        </SubmitButton>
      </div>

      <ViewSwitchLink target="register" prefix="还没有账号？" onSwitch={props.onSwitchView}>
        注册一个
      </ViewSwitchLink>
    </form>
  );
}

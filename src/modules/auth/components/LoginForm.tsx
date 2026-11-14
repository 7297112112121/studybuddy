/**
 * 登录表单（受控，Task 9 渲染层）。提交只走 AuthScreen 校验链：
 * 校验不过呈现错误，通过后由 AuthScreen 决定后续（Task 10 接真实提交）。
 */
import type { FormEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import AgreementCheckbox from "./AgreementCheckbox";
import FormSummary from "./FormSummary";
import SubmitButton from "./SubmitButton";
import ForgotPasswordLink from "./ForgotPasswordLink";
import ViewSwitchLink from "./ViewSwitchLink";
import type { AuthView } from "./AuthTabs";

type LoginFormProps = {
  account: string;
  password: string;
  agreementAccepted: boolean;
  accountError?: string;
  passwordError?: string;
  agreementError?: string;
  /** R1：字段错误（不含协议勾选），FormSummary 按键数计数。 */
  fieldErrors: Partial<Record<"account" | "password", string>>;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAgreementChange: (accepted: boolean) => void;
  /** R16：底部「注册一个」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function LoginForm(props: LoginFormProps) {
  return (
    <form id="auth-login" noValidate onSubmit={props.onSubmit}>
      <FormSummary errors={props.fieldErrors} />

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
          action={<ForgotPasswordLink />}
        />

        <AgreementCheckbox
          id="login-agreement"
          checked={props.agreementAccepted}
          error={props.agreementError}
          onChange={props.onAgreementChange}
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

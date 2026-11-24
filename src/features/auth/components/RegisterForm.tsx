/**
 * 注册表单（受控）。账户名复用 AuthScreen 的 account 值（R16 跨视图保留）。
 * 校验链在 AuthScreen。协议勾选行保留——同意留痕（R15）仅注册侧收集。
 */
import type { FormEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import AgreementCheckbox from "./AgreementCheckbox";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  accountRuleStates,
  confirmPasswordRuleStates,
  passwordRuleStates,
} from "@/auth/validators";
import type { AuthView } from "./AuthTabs";

type RegisterFormProps = {
  account: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
  accountInvalid?: boolean;
  passwordInvalid?: boolean;
  confirmPasswordInvalid?: boolean;
  agreementInvalid?: boolean;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onAgreementChange: (accepted: boolean) => void;
  /** R16/R10：底部「去登录」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function RegisterForm(props: RegisterFormProps) {
  return (
    <form id="auth-register" noValidate onSubmit={props.onSubmit}>
      <div className="space-y-4">
        <AccountField
          id="register-account"
          value={props.account}
          invalid={props.accountInvalid}
          rules={accountRuleStates(props.account)}
          onChange={props.onAccountChange}
        />

        <PasswordField
          id="register-password"
          label="设置密码"
          value={props.password}
          invalid={props.passwordInvalid}
          autoComplete="new-password"
          placeholder={`${PASSWORD_MIN_LENGTH} 位以上，含字母与数字`}
          hint={`长度 ${PASSWORD_MIN_LENGTH}—${PASSWORD_MAX_LENGTH} 位，需同时含字母与数字`}
          rules={passwordRuleStates(props.password)}
          onChange={props.onPasswordChange}
        />

        {/* 确认密码的规则只有匹配一条（R8：强度由「与 password 一致」间接保证）。 */}
        <PasswordField
          id="register-confirm"
          label="确认密码"
          value={props.confirmPassword}
          invalid={props.confirmPasswordInvalid}
          autoComplete="new-password"
          placeholder="再输一次"
          rules={confirmPasswordRuleStates(
            props.password,
            props.confirmPassword,
          )}
          onChange={props.onConfirmPasswordChange}
        />

        <AgreementCheckbox
          id="register-agreement"
          checked={props.agreementAccepted}
          invalid={props.agreementInvalid}
          onChange={props.onAgreementChange}
        />

        <SubmitButton
          submitting={props.submitting}
          pendingKey="submit.registering"
        >
          注册并进入
        </SubmitButton>
      </div>

      <ViewSwitchLink
        target="login"
        prefix="已经有账号了？"
        onSwitch={props.onSwitchView}
      >
        去登录
      </ViewSwitchLink>
    </form>
  );
}

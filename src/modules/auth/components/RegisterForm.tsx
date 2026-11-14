/**
 * 注册表单（受控，Task 9 渲染层）。手机号复用 AuthScreen 的 account 值
 * （R16 跨视图保留、R10 切回登录带入手机号）。校验链在 AuthScreen。
 */
import type { FormEvent } from "react";
import PhoneField from "./PhoneField";
import PasswordField from "./PasswordField";
import AgreementCheckbox from "./AgreementCheckbox";
import FormSummary from "./FormSummary";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import type { AuthView } from "./AuthTabs";

type RegisterFormProps = {
  phone: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
  phoneError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  agreementError?: string;
  /** R1：字段错误（不含协议勾选），FormSummary 按键数计数。 */
  fieldErrors: Partial<
    Record<"phone" | "password" | "confirmPassword", string>
  >;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onAgreementChange: (accepted: boolean) => void;
  /** R16/R10：底部「去登录」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function RegisterForm(props: RegisterFormProps) {
  return (
    <form id="auth-register" noValidate onSubmit={props.onSubmit}>
      <FormSummary errors={props.fieldErrors} />

      <div className="space-y-4">
        <PhoneField
          id="register-phone"
          value={props.phone}
          error={props.phoneError}
          onChange={props.onPhoneChange}
        />

        <PasswordField
          id="register-password"
          label="设置密码"
          value={props.password}
          error={props.passwordError}
          autoComplete="new-password"
          placeholder="8 位以上，含字母与数字"
          hint="长度 8—20 位，需同时含字母与数字"
          onChange={props.onPasswordChange}
        />

        <PasswordField
          id="register-confirm"
          label="确认密码"
          value={props.confirmPassword}
          error={props.confirmPasswordError}
          autoComplete="new-password"
          placeholder="再输一次"
          onChange={props.onConfirmPasswordChange}
        />

        <AgreementCheckbox
          id="register-agreement"
          checked={props.agreementAccepted}
          error={props.agreementError}
          onChange={props.onAgreementChange}
        />

        <SubmitButton
          submitting={props.submitting}
          pendingKey="submit.registering"
        >
          注册并进入
        </SubmitButton>
      </div>

      <ViewSwitchLink target="login" prefix="已经有账号了？" onSwitch={props.onSwitchView}>
        去登录
      </ViewSwitchLink>
    </form>
  );
}

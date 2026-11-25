
import type { FormEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import AgreementCheckbox from "./AgreementCheckbox";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/validation/auth-validators";
import {
  accountRuleStates,
  confirmPasswordRuleStates,
  passwordRuleStates,
  type AuthTopError,
} from "../useClientScreen";
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
  /** 顶部错误键：提交失败的状态机归一产物，null 表示无。 */
  topError: AuthTopError | null;
  /** 顶部错误文案：与 topError 同源，由组合层渲染。 */
  topErrorText?: string;
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
      {props.topError !== null && (
        <Alert variant="destructive" className="mb-4">
          {props.topError === "auth.error.usernameRegistered" ? (
            <Button
              type="button"
              variant="link"
              onClick={() => props.onSwitchView("login")}
              className="h-auto p-0 text-destructive"
            >
              {props.topErrorText}
            </Button>
          ) : (
            props.topErrorText
          )}
        </Alert>
      )}
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

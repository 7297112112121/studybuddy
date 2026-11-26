
import type { SubmitEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import AgreementCheckbox from "./AgreementCheckbox";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import ErrorAlert from "./ErrorAlert";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AuthFormErrors,
} from "@/validation/auth-validators";
import {
  accountRuleStates,
  confirmPasswordRuleStates,
  passwordRuleStates,
  type AuthFormValues,
  type AuthTopError,
  type AuthView,
} from "../useClientScreen";

type RegisterFormProps = {
  /** 表单值：状态机自有形状，跨视图保留由组合层持有。 */
  values: AuthFormValues;
  /** 字段校验错误：键归 validators，红框判定在本表单内派生。 */
  errors: AuthFormErrors;
  /** 顶部错误键：提交失败的状态机归一产物，null 表示无。 */
  errorKey: AuthTopError | null;
  /** 顶部错误文案：与 errorKey 同源，由组合层渲染。 */
  errorText?: string;
  submitting: boolean;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onFieldChange: <K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ) => void;
  /** R16/R10：底部「去登录」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function RegisterForm(props: RegisterFormProps) {
  return (
    <form id="auth-register" noValidate onSubmit={props.onSubmit}>
      {props.errorKey !== null && (
        <ErrorAlert
          errorKey={props.errorKey}
          text={props.errorText ?? ""}
          onSwitchToLogin={() => props.onSwitchView("login")}
        />
      )}
      <div className="space-y-4">
        <AccountField
          id="register-account"
          value={props.values.account}
          invalid={props.errors.username !== undefined}
          rules={accountRuleStates(props.values.account)}
          onChange={(value) => props.onFieldChange("account", value)}
        />

        <PasswordField
          id="register-password"
          label="设置密码"
          value={props.values.password}
          invalid={props.errors.password !== undefined}
          autoComplete="new-password"
          placeholder={`${PASSWORD_MIN_LENGTH} 位以上，含字母与数字`}
          hint={`长度 ${PASSWORD_MIN_LENGTH}—${PASSWORD_MAX_LENGTH} 位，需同时含字母与数字`}
          rules={passwordRuleStates(props.values.password)}
          onChange={(value) => props.onFieldChange("password", value)}
        />

        {/* 确认密码的规则只有匹配一条（R8：强度由「与 password 一致」间接保证）。 */}
        <PasswordField
          id="register-confirm"
          label="确认密码"
          value={props.values.confirmPassword}
          invalid={props.errors.confirmPassword !== undefined}
          autoComplete="new-password"
          placeholder="再输一次"
          rules={confirmPasswordRuleStates(
            props.values.password,
            props.values.confirmPassword,
          )}
          onChange={(value) => props.onFieldChange("confirmPassword", value)}
        />

        <AgreementCheckbox
          id="register-agreement"
          checked={props.values.agreementAccepted}
          invalid={props.errors.agreement !== undefined}
          onChange={(accepted) =>
            props.onFieldChange("agreementAccepted", accepted)
          }
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

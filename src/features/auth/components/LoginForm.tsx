
import type { SubmitEvent } from "react";
import AccountField from "./AccountField";
import PasswordField from "./PasswordField";
import SubmitButton from "./SubmitButton";
import ViewSwitchLink from "./ViewSwitchLink";
import type { AuthFormErrors } from "@/app/api/auth/request";
import type { AuthFormValues, AuthTopError } from "../forms";
import type { AuthView } from "../routes";

type LoginFormValues = Pick<AuthFormValues, "account" | "password">;

type LoginFormProps = {
  /** 表单值：状态机自有形状，跨视图保留由组合层持有。 */
  values: LoginFormValues;
  /** 字段校验错误：键归请求契约(auth-request)，红框判定在本表单内派生。 */
  errors: AuthFormErrors;
  /** 提交失败顶部错误键：凭据不匹配时密码框报红，null 表示无。 */
  errorKey: AuthTopError | null;
  /** 顶部错误文案：与 errorKey 同源，由组合层渲染。 */
  errorText?: string;
  submitting: boolean;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onFieldChange: <K extends keyof LoginFormValues>(
    key: K,
    value: LoginFormValues[K],
  ) => void;
  /** R16：底部「注册一个」切换视图。 */
  onSwitchView: (view: AuthView) => void;
};

export default function LoginForm(props: LoginFormProps) {
  const accountInvalid = props.errors.account !== undefined;
  // 凭据不匹配仅密码框报红，账户框不报红，避免泄露账户探测面。
  const passwordInvalid =
    props.errors.password !== undefined ||
    props.errorKey === "auth.error.invalidCredentials";

  return (
    <form id="auth-login" noValidate onSubmit={props.onSubmit}>
      <div className="space-y-4">
        <AccountField
          id="login-account"
          value={props.values.account}
          invalid={accountInvalid}
          onChange={(value) => props.onFieldChange("account", value)}
        />

        <PasswordField
          id="login-password"
          label="密码"
          value={props.values.password}
          invalid={passwordInvalid}
          autoComplete="current-password"
          placeholder="8 位以上，含字母与数字"
          onChange={(value) => props.onFieldChange("password", value)}
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

"use client";

/**
 * 登录/注册屏（design「UI 与组件」组件树根，Task 9 渲染层，不接网络）。
 *
 * 状态全部提升于此（R16/R5）：activeView、表单值、errors、submitting；
 * 子组件一律纯受控。视图切换不导航，经 history.replaceState 同步
 * /login ↔ /register（R16）。表单提交本任务只走校验并呈现错误：
 * 校验通过后回调可选的 onSubmit（测试 spy 注入用），真实提交由 Task 10
 * 接入——submitting 恒为 false，不出现任何可探测账号存在性的差异文案（R7）。
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";
import {
  validateAccount,
  validatePassword,
  validateRegisterForm,
} from "../validators";
import type { AuthView } from "./AuthTabs";
import AuthTabs from "./AuthTabs";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import OAuthPlaceholder from "./OAuthPlaceholder";

/**
 * 校验错误承载的 messageKey 全集（与 validators.ts 的返回键一一对应）。
 * 显式枚举而非推断，键清单变更时在此同步。
 */
export type AuthMessageKey =
  | "auth.account.required"
  | "auth.account.invalid"
  | "auth.password.required"
  | "auth.password.invalid"
  | "auth.register.phoneInvalid"
  | "auth.register.passwordMismatch"
  | "auth.agreement.required";

/** 表单值（R16：login/register 共用一份，切换视图保留）。注册手机号复用 account。 */
export type AuthFormValues = {
  account: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

/** 错误状态：协议勾选错误单列（R4，不进顶部汇总计数），其余进 FormSummary（R1）。 */
export type AuthFormErrors = Partial<
  Record<
    "account" | "phone" | "password" | "confirmPassword" | "agreement",
    AuthMessageKey
  >
>;

/** FormSummary 计数用：去掉 agreement 后的字段错误（已渲染为文案）。 */
export type AuthFieldErrors = Partial<
  Record<"account" | "phone" | "password" | "confirmPassword", string>
>;

type AuthScreenProps = {
  initialView: AuthView;
  /** Task 9 仅渲染层：校验通过后的回调（测试 spy 注入用），Task 10 接入真实提交。 */
  onSubmit?: () => void;
};

export default function AuthScreen(props: AuthScreenProps) {
  const [activeView, setActiveView] = useState<AuthView>(props.initialView);
  const [values, setValues] = useState<AuthFormValues>({
    account: "",
    password: "",
    confirmPassword: "",
    agreementAccepted: false,
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  // R5：submitting 由 Task 10 接网络时改为完整 useState（本任务不接网络，恒 false）。
  const [submitting] = useState<boolean>(false);
  const t = useTranslations("auth");

  /** messageKey → 渲染文案（去掉 "auth." 命名空间前缀后交给 useTranslations）。 */
  function errorText(key: AuthMessageKey): string {
    return t(key.slice("auth.".length));
  }

  function updateValue<K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** R16：切换视图保留表单值、清空错误，URL 同步但不导航。 */
  function switchView(view: AuthView): void {
    setActiveView(view);
    setErrors({});
    window.history.replaceState(
      null,
      "",
      view === "login" ? ROUTES.login : ROUTES.register,
    );
  }

  /** R1/R2/R3/R4：登录校验链。任一项不过则呈现错误、不触发提交。 */
  function handleLoginSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const accountCheck = validateAccount(values.account);
    const passwordCheck = validatePassword(values.password);
    const nextErrors: AuthFormErrors = {};
    if (!accountCheck.ok) {
      nextErrors.account = accountCheck.messageKey;
    }
    if (!passwordCheck.ok) {
      nextErrors.password = passwordCheck.messageKey;
    }
    if (!values.agreementAccepted) {
      nextErrors.agreement = "auth.agreement.required";
    }
    setErrors(nextErrors);
    if (
      accountCheck.ok &&
      passwordCheck.ok &&
      values.agreementAccepted
    ) {
      props.onSubmit?.();
    }
  }

  /** R8：注册校验链（validateRegisterForm 含协议勾选）。 */
  function handleRegisterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const registerErrors: AuthFormErrors =
      validateRegisterForm({
        phone: values.account,
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreementAccepted: values.agreementAccepted,
      }) ?? {};
    setErrors(registerErrors);
    if (Object.keys(registerErrors).length === 0) {
      props.onSubmit?.();
    }
  }

  const fieldErrors: AuthFieldErrors = {};
  if (errors.account !== undefined) {
    fieldErrors.account = errorText(errors.account);
  }
  if (errors.phone !== undefined) {
    fieldErrors.phone = errorText(errors.phone);
  }
  if (errors.password !== undefined) {
    fieldErrors.password = errorText(errors.password);
  }
  if (errors.confirmPassword !== undefined) {
    fieldErrors.confirmPassword = errorText(errors.confirmPassword);
  }
  const agreementError =
    errors.agreement !== undefined ? errorText(errors.agreement) : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-[1fr_1.2fr]">
        {/* 品牌区（线框图左侧，静态文案） */}
        <aside className="hidden md:block">
          <p className="text-2xl font-bold text-slate-800">AI 学业陪伴</p>
          <h2 className="mt-4 text-xl font-semibold text-slate-700">
            你的规划、任务和情绪
            <br />
            都在一个账号里
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            登录后接着上次的进度继续，换设备也一样。
          </p>
        </aside>

        {/* 表单卡片 */}
        <section className="rounded-xl bg-white p-6 shadow-md">
          <AuthTabs active={activeView} onSwitch={switchView} />

          {activeView === "login" ? (
            <LoginForm
              account={values.account}
              password={values.password}
              agreementAccepted={values.agreementAccepted}
              accountError={fieldErrors.account}
              passwordError={fieldErrors.password}
              agreementError={agreementError}
              fieldErrors={fieldErrors}
              submitting={submitting}
              onSubmit={handleLoginSubmit}
              onAccountChange={(value) => updateValue("account", value)}
              onPasswordChange={(value) => updateValue("password", value)}
              onAgreementChange={(accepted) =>
                updateValue("agreementAccepted", accepted)
              }
              onSwitchView={switchView}
            />
          ) : (
            <RegisterForm
              phone={values.account}
              password={values.password}
              confirmPassword={values.confirmPassword}
              agreementAccepted={values.agreementAccepted}
              phoneError={fieldErrors.phone}
              passwordError={fieldErrors.password}
              confirmPasswordError={fieldErrors.confirmPassword}
              agreementError={agreementError}
              fieldErrors={fieldErrors}
              submitting={submitting}
              onSubmit={handleRegisterSubmit}
              onPhoneChange={(value) => updateValue("account", value)}
              onPasswordChange={(value) => updateValue("password", value)}
              onConfirmPasswordChange={(value) =>
                updateValue("confirmPassword", value)
              }
              onAgreementChange={(accepted) =>
                updateValue("agreementAccepted", accepted)
              }
              onSwitchView={switchView}
            />
          )}

          <OAuthPlaceholder />
        </section>
      </div>
    </main>
  );
}

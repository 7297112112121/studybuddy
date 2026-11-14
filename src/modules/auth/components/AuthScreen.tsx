"use client";

/**
 * 登录/注册屏（design「UI 与组件」组件树根，Task 9 渲染层 + Task 10 提交流程）。
 *
 * 状态全部提升于此（R16/R5）：activeView、表单值、errors、submitting、
 * 顶部错误（topError）；子组件一律纯受控。视图切换不导航，经
 * history.replaceState 同步 /login ↔ /register（R16）。
 *
 * 提交流程（Task 10）：登录/注册校验通过后接真实提交——
 * - 登录：邮箱形态账号（B2）不发起请求、直接呈现 R7 统一文案；手机号形态
 *   经 authClient.signIn.phoneNumber（返回 {data, error}，错误经
 *   mapSignInError 归一）；成功 router.replace(ROUTES.workbench)（R6）。
 * - 注册：registerAction（ADR-0025 判别联合）→ 成功经 signIn.phoneNumber
 *   自动登录 → router.replace(ROUTES.workbench)（R9）；
 *   PHONE_ALREADY_REGISTERED → 顶部文案（R10）；INVALID_INPUT fieldErrors
 *   归位到字段。任何失败不出现可探测账号存在性的差异文案（R7）。
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";
import { registerAction } from "../actions";
import type { RegisterInput } from "../schema";
import { mapSignInError } from "../errors";
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

/**
 * 顶部错误键（auth.error.* 命名空间，与 auth.json error 组对应）：
 * 登录失败经 mapSignInError 归一（R7），注册撞号固定 phoneRegistered（R10）。
 */
export type AuthTopError =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown"
  | "auth.error.phoneRegistered";

type AuthScreenProps = {
  initialView: AuthView;
};

export default function AuthScreen(props: AuthScreenProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AuthView>(props.initialView);
  const [values, setValues] = useState<AuthFormValues>({
    account: "",
    password: "",
    confirmPassword: "",
    agreementAccepted: false,
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  // R5：提交中禁用按钮、文案切「登录中…/注册中…」，不可重复提交。
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [topError, setTopError] = useState<AuthTopError | null>(null);
  const t = useTranslations("auth");

  /** messageKey → 渲染文案（去掉 "auth." 命名空间前缀后交给 useTranslations）。 */
  function errorText(key: AuthMessageKey | AuthTopError): string {
    return t(key.slice("auth.".length));
  }

  function updateValue<K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** R16/R10：切换视图保留表单值、清空错误（含顶部错误），URL 同步但不导航。 */
  function switchView(view: AuthView): void {
    setActiveView(view);
    setErrors({});
    setTopError(null);
    window.history.replaceState(
      null,
      "",
      view === "login" ? ROUTES.login : ROUTES.register,
    );
  }

  /** R6/R9：登录/自动登录成功一律 replace 到工作台（不留登录页历史）。 */
  async function signInWithPhoneNumber(): Promise<void> {
    const result = await authClient.signIn.phoneNumber({
      phoneNumber: values.account,
      password: values.password,
    });
    if (result.error) {
      setTopError(mapSignInError(result.error));
      return;
    }
    router.replace(ROUTES.workbench);
  }

  /** R5：登录提交（校验已通过）。pending 期间不可重复提交。 */
  async function submitSignIn(): Promise<void> {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setTopError(null);
    try {
      await signInWithPhoneNumber();
    } catch {
      // 网络层异常归一为 unknown（errors.ts 兜底约定，不泄露失败细节）。
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
  }

  /** R5/R9：注册提交（校验已通过）：registerAction → 成功自动登录 → 工作台。 */
  async function submitRegister(): Promise<void> {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setTopError(null);
    try {
      const result = await registerAction({
        phone: values.account,
        password: values.password,
        confirmPassword: values.confirmPassword,
        // R8 校验链通过后协议必为 true（validateRegisterForm 已拦截），按契约收窄。
        agreementAccepted: true,
      } satisfies RegisterInput);
      if (!result.ok) {
        if (result.error === "PHONE_ALREADY_REGISTERED") {
          setTopError("auth.error.phoneRegistered");
          return;
        }
        setErrors(result.fieldErrors);
        return;
      }
      await signInWithPhoneNumber();
    } catch {
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
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
      !accountCheck.ok ||
      !passwordCheck.ok ||
      !values.agreementAccepted
    ) {
      return;
    }
    // B2：邮箱形态账号不发起请求，直接呈现 R7 统一文案（与错密码同文案，
    // 不产生任何可探测账号存在性的差异）。
    if (accountCheck.kind === "email") {
      setTopError("auth.error.invalidCredentials");
      return;
    }
    void submitSignIn();
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
      void submitRegister();
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

          {/* 顶部错误（R7/R10）：服务端/客户端提交失败统一置顶呈现；
              撞号文案整体可点，切回登录视图并带入手机号（R10）。 */}
          {topError === null ? null : (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            >
              {topError === "auth.error.phoneRegistered" ? (
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="font-medium underline"
                >
                  {errorText(topError)}
                </button>
              ) : (
                errorText(topError)
              )}
            </div>
          )}

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

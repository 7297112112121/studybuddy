"use client";

/**
 * 登录/注册屏（design「UI 与组件」组件树根 + 提交流程，Task 9 收口）。
 *
 * 状态全部提升于此（R16/R5）：activeView、表单值、errors、submitting、
 * 顶部错误（topError）；子组件一律纯受控。视图切换不导航，经
 * history.replaceState 同步 /login ↔ /register（R16）。
 *
 * 提交流程（CR-20261116-1：凭据手机号→账户名+密码）——
 * - 登录：D-13 无协议校验（同意留痕仅注册侧收集）、无邮箱特例分支——
 *   邮箱等不合格形态经 validateAccount 返回 E-02 字段错误，不发起请求；
 *   合法账户名经 authClient.signIn.username（返回 {data, error}，错误经
 *   mapSignInError 归一）；成功 router.replace(ROUTES.workbench)（R6）。
 * - 注册：registerAction（ADR-0025 判别联合）→ 成功经 signIn.username
 *   自动登录 → router.replace(ROUTES.workbench)（R9）；
 *   USERNAME_ALREADY_REGISTERED → 顶部可点文案切登录并带入账户名（R10）；
 *   INVALID_INPUT fieldErrors 归位到字段。任何失败不出现可探测账户名
 *   存在性的差异文案（R7）。
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck2Icon, CheckIcon } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { authClient } from "@/lib/auth-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

/**
 * 校验错误承载的 messageKey 全集（与 validators.ts 的返回键一一对应）。
 * 显式枚举而非推断，键清单变更时在此同步。username 无独立注册键
 * （E-01/E-02 复用 auth.account.*）。
 */
export type AuthMessageKey =
  | "auth.account.required"
  | "auth.account.invalid"
  | "auth.password.required"
  | "auth.password.invalid"
  | "auth.register.passwordMismatch"
  | "auth.agreement.required";

/** 表单值（R16：login/register 共用一份，切换视图保留）。注册账户名复用 account。 */
export type AuthFormValues = {
  account: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

/** 错误状态：协议勾选错误单列（R4），其余以字段级文案呈现在各输入框下。 */
export type AuthFormErrors = Partial<
  Record<
    "account" | "username" | "password" | "confirmPassword" | "agreement",
    AuthMessageKey
  >
>;

/**
 * 顶部错误键（auth.error.* 命名空间，与 auth.json error 组对应）：
 * 登录失败经 mapSignInError 归一（R7），注册撞号固定 usernameRegistered（R10）。
 */
export type AuthTopError =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown"
  | "auth.error.usernameRegistered";

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
  async function signInWithUsername(): Promise<void> {
    const result = await authClient.signIn.username({
      username: values.account,
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
      await signInWithUsername();
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
        username: values.account,
        password: values.password,
        confirmPassword: values.confirmPassword,
        // R8 校验链通过后协议必为 true（validateRegisterForm 已拦截），按契约收窄。
        agreementAccepted: true,
      } satisfies RegisterInput);
      if (!result.ok) {
        if (result.error === "USERNAME_ALREADY_REGISTERED") {
          setTopError("auth.error.usernameRegistered");
          return;
        }
        setErrors(result.fieldErrors);
        return;
      }
      await signInWithUsername();
    } catch {
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * R1/R2/R3：登录校验链。任一项不过则呈现错误、不触发提交。
   * D-13：无协议校验（同意留痕 R15 仅注册侧收集）；无邮箱特例分支——
   * 邮箱等不合格形态经 validateAccount 归 E-02 字段错误（B2 新语义）。
   */
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
    setErrors(nextErrors);
    if (!accountCheck.ok || !passwordCheck.ok) {
      return;
    }
    void submitSignIn();
  }

  /** R8：注册校验链（validateRegisterForm 含协议勾选）。 */
  function handleRegisterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const registerErrors: AuthFormErrors =
      validateRegisterForm({
        username: values.account,
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreementAccepted: values.agreementAccepted,
      }) ?? {};
    setErrors(registerErrors);
    if (Object.keys(registerErrors).length === 0) {
      void submitRegister();
    }
  }

  const errorOf = (key: keyof Omit<AuthFormErrors, "agreement">) =>
    errors[key] !== undefined ? errorText(errors[key]) : undefined;
  const agreementError =
    errors.agreement !== undefined ? errorText(errors.agreement) : undefined;

  return (
    <main className="relative isolate grid min-h-dvh overflow-hidden bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* aurora 光斑装饰层（aria-hidden）：aqua/magenta/indigo 柔光斑，
          压在纸面底色上、垫在内容之后，右列玻璃卡片隔其取景。 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-1/5 size-80 rounded-full bg-aurora-aqua/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 size-96 rounded-full bg-aurora-magenta/15 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 size-80 rounded-full bg-aurora-indigo/10 blur-3xl" />
      </div>

      {/* 品牌面板（lg+）：整页唯一的浓墨处——aurora 深端渐变（aqua-deep→
          magenta-deep）反白，今日时间线给产品语境。
          静态装饰内容（aria-hidden），沿用线框图左侧静态文案约定（文案测试依赖）。 */}
      <aside className="hidden flex-col justify-between bg-linear-[155deg] from-aurora-aqua-deep to-aurora-magenta-deep p-10 text-primary-foreground lg:flex">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CalendarCheck2Icon aria-hidden="true" className="size-5" />
          AI 学业陪伴
        </p>
        <div>
          <h1 className="text-3xl font-semibold leading-snug xl:text-4xl">
            你的规划、任务和情绪
            <br />
            都在一个账号里
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/70">
            登录后接着上次的进度继续，换设备也一样。
          </p>
          {/* 今日时间线：产品语境的「实物」示意，非真实数据；三个状态
              （已完成/进行中/待开始）以图标表达，不加编号。 */}
          <ul
            aria-hidden="true"
            className="mt-10 space-y-1 border-l border-primary-foreground/25 pl-5"
          >
            <li className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-12 shrink-0 text-primary-foreground/60">
                08:00
              </span>
              <span className="flex-1 text-primary-foreground/80">
                晨读 30 分钟
              </span>
              <CheckIcon
                aria-hidden="true"
                className="size-4 text-primary-foreground/60"
              />
            </li>
            <li className="mx-[-1.25rem] flex items-center gap-3 rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-sm font-medium">
              <span className="w-12 shrink-0 text-primary-foreground/70">
                14:00
              </span>
              <span className="flex-1">微积分习题集</span>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary-foreground"
              />
            </li>
            <li className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-12 shrink-0 text-primary-foreground/60">
                21:30
              </span>
              <span className="flex-1 text-primary-foreground/80">今日复盘</span>
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full border border-primary-foreground/50"
              />
            </li>
          </ul>
        </div>
      </aside>

      {/* 表单列：玻璃质感卡片（半透明 card + backdrop-blur）浮在 aurora 光斑上，
          签名观感来自卡片后透出的柔光。 */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/75 p-8 shadow-lg backdrop-blur-md">
          {/* 移动端品牌条（lg 以下品牌面板隐藏） */}
          <div className="mb-8 lg:hidden">
            <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CalendarCheck2Icon aria-hidden="true" className="size-5" />
              AI 学业陪伴
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              你的规划、任务和情绪，都在一个账号里。
            </p>
          </div>

          <AuthTabs active={activeView} onSwitch={switchView} />

          {/* 顶部错误（R7/R10）：服务端/客户端提交失败统一置顶呈现；
              撞号文案整体可点，切回登录视图并带入账户名（R10）。 */}
          {topError === null ? null : (
            <Alert variant="destructive" className="mb-4">
              {topError === "auth.error.usernameRegistered" ? (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => switchView("login")}
                  className="h-auto p-0 text-destructive"
                >
                  {errorText(topError)}
                </Button>
              ) : (
                errorText(topError)
              )}
            </Alert>
          )}

          {activeView === "login" ? (
            <LoginForm
              account={values.account}
              password={values.password}
              accountError={errorOf("account")}
              passwordError={errorOf("password")}
              submitting={submitting}
              onSubmit={handleLoginSubmit}
              onAccountChange={(value) => updateValue("account", value)}
              onPasswordChange={(value) => updateValue("password", value)}
              onSwitchView={switchView}
            />
          ) : (
            <RegisterForm
              account={values.account}
              password={values.password}
              confirmPassword={values.confirmPassword}
              agreementAccepted={values.agreementAccepted}
              accountError={errorOf("username")}
              passwordError={errorOf("password")}
              confirmPasswordError={errorOf("confirmPassword")}
              agreementError={agreementError}
              submitting={submitting}
              onSubmit={handleRegisterSubmit}
              onAccountChange={(value) => updateValue("account", value)}
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
        </div>
      </section>
    </main>
  );
}

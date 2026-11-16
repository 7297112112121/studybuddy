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

  /** 字段错误态：仅以红框呈现（aria-invalid），文案不再渲染。 */
  const isInvalid = (key: keyof Omit<AuthFormErrors, "agreement">) =>
    errors[key] !== undefined;
  const agreementInvalid = errors.agreement !== undefined;

  return (
    <main className="aurora-theme relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      {/* aurora 背景层（aria-hidden，-z-10）：墨底上散布柔光斑 → aurora 纱幕
          （网格 + 颗粒）→ 双重压暗（中央保持可读、边缘沉入墨底）。
          整页一张背景，卡片与宣传列同景，不再有分区边界。 */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-aurora-aqua/30 blur-3xl" />
        <div className="absolute top-1/4 right-1/3 size-96 rounded-full bg-aurora-indigo/30 blur-3xl" />
        <div className="absolute -bottom-44 -right-24 size-[30rem] rounded-full bg-aurora-magenta/25 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-72 rounded-full bg-aurora-indigo-deep/40 blur-3xl" />
        <div className="absolute top-1/2 -left-16 size-80 rounded-full bg-aurora-magenta-deep/20 blur-3xl" />
        <div className="aurora-veil absolute inset-0" />
        <div className="absolute inset-0 bg-aurora-ink/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--aurora-ink)_100%)]" />
      </div>

      {/* 主内容：lg 双列（宣传列左 / 玻璃卡右），移动端单列且卡片在前。
          max-w-7xl 居中，所有内容直接压在共享 aurora 背景上。 */}
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-2 lg:gap-10">
        {/* 玻璃签名卡（移动端在前）：.glass-card 提供卡面渐变、内描边高光与
            深投影，backdrop-blur 隔角落「吻光」取景；加载入场一次淡入上滑，
            prefers-reduced-motion 下关闭。 */}
        <section className="relative order-1 lg:order-2 lg:justify-self-end">
          {/* 角落 aurora 吻光（aria-hidden）：垫在玻璃卡后，隔毛玻璃透出柔光。 */}
          <div
            aria-hidden="true"
            className="absolute -top-10 -right-10 -z-10 size-40 rounded-full bg-aurora-magenta/30 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-10 -left-10 -z-10 size-40 rounded-full bg-aurora-aqua/25 blur-2xl"
          />
          <div className="glass-card mx-auto w-full max-w-md rounded-4xl border border-border p-8 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 [animation-duration:600ms] [animation-fill-mode:both] motion-reduce:animate-none">
            {/* 视图级大标题（auth-2 视觉重做）：随 activeView 切换文案。 */}
            <h1 className="mb-5 text-3xl font-bold tracking-tight text-foreground">
              {activeView === "login" ? "欢迎回来" : "创建你的账号"}
            </h1>

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

            {/* 表单区：key 驱动切视图时 300ms 淡入上滑（动作回应），reduced-motion 关。 */}
            <div
              key={activeView}
              className="animate-in fade-in slide-in-from-bottom-2 [animation-duration:300ms] [animation-fill-mode:both] motion-reduce:animate-none"
            >
              {activeView === "login" ? (
                <LoginForm
                  account={values.account}
                  password={values.password}
                  accountInvalid={isInvalid("account")}
                  passwordInvalid={isInvalid("password")}
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
                  accountInvalid={isInvalid("username")}
                  passwordInvalid={isInvalid("password")}
                  confirmPasswordInvalid={isInvalid("confirmPassword")}
                  agreementInvalid={agreementInvalid}
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
          </div>
        </section>

        {/* 宣传列（移动端垫在卡片后）：与卡片同景直接压在 aurora 背景上——
            无面板底色，分区边界不再存在。品牌语 + 渐变强调标题 + 今日时间线
            （静态示意，aria-hidden），沿用线框图静态文案约定。 */}
        <aside className="order-2 flex flex-col justify-center lg:order-1">
          <div className="animate-in fade-in slide-in-from-bottom-4 [animation-duration:600ms] [animation-fill-mode:both] motion-reduce:animate-none">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck2Icon
                aria-hidden="true"
                className="size-5 text-aurora-aqua"
              />
              AI 学业陪伴
            </p>
            <p className="mt-6 max-w-lg text-4xl leading-snug font-semibold tracking-tight xl:text-5xl">
              你的规划、任务和情绪
              <br />
              都在
              <span className="bg-linear-[100deg] from-aurora-aqua-bright to-aurora-magenta bg-clip-text text-transparent">
                一个账号
              </span>
              里
            </p>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              登录后接着上次的进度继续，换设备也一样。
            </p>
            {/* 今日时间线：产品语境的「实物」示意，非真实数据；三个状态
                （已完成/进行中/待开始）以图标表达，不加编号。 */}
            <ul
              aria-hidden="true"
              className="mt-10 max-w-md space-y-1 border-l border-border pl-5"
            >
              <li className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-12 shrink-0 text-muted-foreground">
                  08:00
                </span>
                <span className="flex-1 text-foreground/80">晨读 30 分钟</span>
                <CheckIcon
                  aria-hidden="true"
                  className="size-4 text-aurora-aqua"
                />
              </li>
              <li className="mx-[-1.25rem] flex items-center gap-3 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium">
                <span className="w-12 shrink-0 text-muted-foreground">
                  14:00
                </span>
                <span className="flex-1">微积分习题集</span>
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-aurora-aqua"
                />
              </li>
              <li className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-12 shrink-0 text-muted-foreground">
                  21:30
                </span>
                <span className="flex-1 text-foreground/80">今日复盘</span>
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full border border-muted-foreground/50"
                />
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

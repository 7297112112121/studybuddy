"use client";

/**
 * 登录/注册屏的表单状态机与登录错误文案映射。提交链携带凭据，日志与失败文案不得泄露凭据细节。
 * 注册表单提交前校验与规则浮层实时拆解同居本文件：客户端页面校验逻辑
 * 不入服务端技术层（src/auth/validators.ts 只留规则单一来源与复验 schema）。
 */
import { useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import { API_ERROR } from "@/common/error";
import { ROUTES } from "@/common/routes";
import { authClient } from "@/stores/auth-client";
import type { RegisterApiResult } from "@/app/api/auth/register/route";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_RE,
  validateAccount,
  validatePassword,
  type AuthFormErrors,
  type AuthMessageKey,
} from "@/auth/validators";
import type { AuthView } from "./components/AuthTabs";

/** 表单值（login/register 共用一份，切换视图保留）。注册账户名复用 account。 */
export type AuthFormValues = {
  account: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

/** 登录失败映射后的文案键（auth.error.* 命名空间）。 */
export type SignInErrorKey =
  | "auth.error.invalidCredentials"
  | "auth.error.tooManyAttempts"
  | "auth.error.unknown";

/** 屏顶部错误键：登录失败经 mapSignInError 归一；注册账户名已存在固定为账户名已存在（usernameRegistered）。 */
export type AuthTopError = SignInErrorKey | "auth.error.usernameRegistered";

/** 注册入参类型契约：客户端提交统一接口注册端点的请求体形状（服务端复验走 validators.ts 的 registerFormSchema）。 */
export type RegisterInput = {
  username: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

export type RegisterFormErrors = Partial<{
  username: "auth.account.invalid";
  password: "auth.password.required" | "auth.password.invalid";
  confirmPassword: "auth.register.passwordMismatch";
  agreement: "auth.agreement.required";
}>;

/**
 * 注册表单提交前校验：账户名/密码/确认密码（R8）/协议（R15）合并判定，
 * 全过返回 null。自 src/auth/validators.ts 迁入——客户端页面校验逻辑
 * 不入服务端技术层；规则界限仍以 validators.ts 导出的常量与正则为单一来源。
 */
export function validateRegisterForm(
  v: RegisterInput,
): RegisterFormErrors | null {
  const errors: RegisterFormErrors = {};

  if (!USERNAME_RE.test(v.username)) {
    errors.username = "auth.account.invalid";
  }

  const passwordCheck = validatePassword(v.password);
  if (!passwordCheck.ok) {
    errors.password = passwordCheck.messageKey;
  } else if (v.confirmPassword === "" || v.confirmPassword !== v.password) {
    errors.confirmPassword = "auth.register.passwordMismatch";
  }

  if (!v.agreementAccepted) {
    errors.agreement = "auth.agreement.required";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * 字段规则清单项（AXY-8 UI 优化：聚焦浮层实时侦测，自 validators.ts 迁入）。
 * label 为页面静态文案（与 AccountField 的 Label/hint 同约定，不入 auth.json）。
 */
export type FieldRuleState = {
  label: string;
  passed: boolean;
};

/**
 * 账户名字符集（无长度量词）——仅供规则浮层做「字符集/长度」两条正交
 * 拆解；字符类括号表达式必须与 USERNAME_RE 逐字符一致（长度仅由
 * USERNAME_RE 的量词单一约束），改动任一处须同步。
 */
const USERNAME_CHARSET_RE = /^[一-龥A-Za-z0-9_]+$/;

/** 字母与数字同时存在（PASSWORD_RE 两段 look-ahead 的同源拆解）。 */
const PASSWORD_MIX_RE = /^(?=.*[A-Za-z])(?=.*\d)/;

/**
 * 账户名规则实时拆解。不变量：每条 passed 全真 ⇔ validateAccount.ok
 * （required 除外——空值时两条均为 false，由 required 文案兜底）。
 * 正则为全仓单一来源，勿在此处另写规则。
 */
export function accountRuleStates(raw: string): FieldRuleState[] {
  return [
    {
      label: `长度 ${USERNAME_MIN_LENGTH}—${USERNAME_MAX_LENGTH} 个字符`,
      passed:
        raw.length >= USERNAME_MIN_LENGTH && raw.length <= USERNAME_MAX_LENGTH,
    },
    {
      label: "仅含中文、字母、数字或下划线",
      passed: USERNAME_CHARSET_RE.test(raw),
    },
  ];
}

/** 密码规则实时拆解。不变量：每条 passed 全真 ⇔ validatePassword.ok（required 除外）。 */
export function passwordRuleStates(raw: string): FieldRuleState[] {
  return [
    {
      label: `长度 ${PASSWORD_MIN_LENGTH}—${PASSWORD_MAX_LENGTH} 位`,
      passed:
        raw.length >= PASSWORD_MIN_LENGTH && raw.length <= PASSWORD_MAX_LENGTH,
    },
    { label: "需同时含字母与数字", passed: PASSWORD_MIX_RE.test(raw) },
  ];
}

/**
 * 确认密码规则实时拆解。不变量：passed 等价于「非空且与 password 一致」，
 * 与 validateRegisterForm 的确认密码判定同语义（空值视为不一致）。
 */
export function confirmPasswordRuleStates(
  password: string,
  confirmPassword: string,
): FieldRuleState[] {
  return [
    {
      label: "与第一次输入一致",
      passed: confirmPassword !== "" && confirmPassword === password,
    },
  ];
}

/** 把 better-auth 客户端错误对象（status 可选）映射为登录文案键，空值兜底未知（unknown）。 */
export function mapSignInError(
  err: { status?: number } | null | undefined,
): SignInErrorKey {
  if (!err) {
    return "auth.error.unknown";
  }
  if (err.status === 429) {
    return "auth.error.tooManyAttempts";
  }
  if (err.status === 401 || err.status === 400) {
    return "auth.error.invalidCredentials";
  }
  return "auth.error.unknown";
}

/** 产出组合层渲染所需的全部状态、派生错误态与回调。 */
export function useClientScreen(initialView: AuthView) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AuthView>(initialView);
  const [values, setValues] = useState<AuthFormValues>({
    account: "",
    password: "",
    confirmPassword: "",
    agreementAccepted: false,
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  // 提交中禁用按钮、文案切「登录中…/注册中…」，不可重复提交。
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [topError, setTopError] = useState<AuthTopError | null>(null);
  const t = useTranslations("auth");

  /**
   * 渲染文案：去掉 "auth." 命名空间前缀后交给 useTranslations。
   * 规则界限经插值注入，文案模板的数字与 validators 常量单一来源衔接。
   */
  function errorText(key: AuthMessageKey | AuthTopError): string {
    return t(key.slice("auth.".length), {
      accountMin: USERNAME_MIN_LENGTH,
      accountMax: USERNAME_MAX_LENGTH,
      passwordMin: PASSWORD_MIN_LENGTH,
      passwordMax: PASSWORD_MAX_LENGTH,
    });
  }

  function updateValue<K extends keyof AuthFormValues>(
    key: K,
    value: AuthFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  /** 切换视图保留表单值、清空错误（含顶部错误），URL 同步但不导航。 */
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

  /** 登录/自动登录成功一律 replace 到工作台（不留登录页历史）。 */
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

  /** 登录提交 */
  async function submitSignIn(): Promise<void> {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setTopError(null);
    try {
      await signInWithUsername();
    } catch {
      // 网络层异常归一为未知（unknown），不泄露失败细节。
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
  }

  /** 注册提交：POST 统一接口注册端点（评审裁决 5b），成功自动登录进工作台。 */
  async function submitRegister(): Promise<void> {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setTopError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.account,
          password: values.password,
          confirmPassword: values.confirmPassword,
          agreementAccepted: values.agreementAccepted,
        }),
      });
      const result = (await response.json()) as RegisterApiResult;
      if (!result.ok) {
        if (result.error === USERNAME_ALREADY_REGISTERED) {
          setTopError("auth.error.usernameRegistered");
          return;
        }
        if (result.error === API_ERROR.INVALID_INPUT) {
          setErrors(result.fieldErrors as AuthFormErrors);
        }
        return;
      }
      await signInWithUsername();
    } catch {
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
  }

  /** 登录校验链：任一项不过则呈现错误、不提交。 */
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

  /** 注册校验链（validateRegisterForm 含协议勾选）。 */
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

  return {
    activeView,
    values,
    errors,
    submitting,
    topError,
    errorText,
    updateValue,
    switchView,
    isInvalid,
    agreementInvalid,
    handleLoginSubmit,
    handleRegisterSubmit,
  };
}

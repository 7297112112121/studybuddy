/**
 * 认证域写流程链：账户表单链（登录/注册共用一份表单态，两条提交分支）。
 * 提交门校验用账户域请求契约的 schema（src/app/api/auth/request.ts），链内
 * 只持表单态、校验分派与契约结果分支；登录经 Better Auth 托管端点，失败经
 * mapSignInError 折算文案键。提交链携带凭据，日志与失败文案不得泄露凭据细节。
 */
import { useState } from "react";
import type { SubmitEvent } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { mapSignInError, type SignInErrorKey } from "@/auth/error";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/validation/auth";
import {
  loginFormSchema,
  registerFormSchema,
  type AuthFormErrors,
  type AuthMessageKey,
} from "@/app/api/auth/request";
import { registerAccount } from "@/api/auth";
import { useApiFailureHandler } from "@/api/contract";
import { toFieldErrors } from "@/common/error";
import { ROUTES } from "@/common/routes";
import { authClient } from "@/stores/auth-client";

/** 表单值（login/register 共用一份，切换视图保留）。注册账户名复用 account。 */
export type AuthFormValues = {
  account: string;
  password: string;
  confirmPassword: string;
  agreementAccepted: boolean;
};

/** 屏顶部错误键：登录失败经 mapSignInError 归一；注册账户名已存在固定为账户名已存在（usernameRegistered）。 */
export type AuthTopError = SignInErrorKey | "auth.error.usernameRegistered";

/** 账户表单链：表单态、字段错误即时呈现与登录/注册两条提交分支。表单组合层（AuthCard）的唯一链挂载点。 */
export function useAuthForm() {
  const router = useRouter();
  const handleApiFailure = useApiFailureHandler();
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
   * 规则界限经插值注入，文案模板的数字与请求契约常量单一来源衔接。
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

  /** 清空反馈（字段错误与顶部错误）：视图切换时由组合层调用。 */
  function clearFeedback(): void {
    setErrors({});
    setTopError(null);
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

  /** 注册提交：POST 统一接口注册端点，成功自动登录进工作台。 */
  async function submitRegister(): Promise<void> {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setTopError(null);
    try {
      const result = await registerAccount({
        username: values.account,
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreementAccepted: values.agreementAccepted,
      });
      if (!result.ok) {
        await handleApiFailure(result, {
          onInvalidInput: (fieldErrors) =>
            setErrors(fieldErrors as AuthFormErrors),
          onDomainCode: () => setTopError("auth.error.usernameRegistered"),
          onFailure: () => setTopError("auth.error.unknown"),
        });
        return;
      }
      await signInWithUsername();
    } catch {
      // better-auth 客户端异常归一为未知（unknown）；统一接口请求封装不抛出
      setTopError("auth.error.unknown");
    } finally {
      setSubmitting(false);
    }
  }

  /** 登录提交前校验：登录表单 schema(loginFormSchema) 不过则呈现字段错误、不提交。 */
  function handleLoginSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = loginFormSchema.safeParse({
      account: values.account,
      password: values.password,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error) as AuthFormErrors);
      return;
    }
    setErrors({});
    void submitSignIn();
  }

  /** 注册提交前校验：注册表单 schema(registerFormSchema,与服务端复验同一 schema) 不过则呈现字段错误、不提交。 */
  function handleRegisterSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = registerFormSchema.safeParse({
      username: values.account,
      password: values.password,
      confirmPassword: values.confirmPassword,
      agreementAccepted: values.agreementAccepted,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error) as AuthFormErrors);
      return;
    }
    setErrors({});
    void submitRegister();
  }

  return {
    values,
    errors,
    submitting,
    topError,
    errorText,
    updateValue,
    clearFeedback,
    handleLoginSubmit,
    handleRegisterSubmit,
  };
}

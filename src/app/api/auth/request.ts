/**
 * 账户域请求(入参)wire 契约:注册 schema 为注册提交门与统一接口复验共用,
 * 登录 schema 仅客户端提交门(登录经 Better Auth 托管端点,无服务端复验);
 * 规则浮层实时拆解(纯 UI 呈现)居 features/auth/useClientScreen.ts,经导入
 * 同源衔接,勿回流本文件。校验规则在 src/validation/auth,本域无响应契约
 * 文件:统一接口收编范围仅注册端点且成功无载荷。
 */
import { z } from "zod";

import { PASSWORD_RE, USERNAME_RE } from "@/validation/auth";

/**
 * 校验错误承载的 messageKey 全集(与本文件 schema 的 message 键一一对应)。
 * 显式枚举而非推断,键清单变更时在此同步;账户名无独立注册键,
 * 登录/注册复用 auth.account.* 文案组。
 */
export type AuthMessageKey =
  | "auth.account.required"
  | "auth.account.invalid"
  | "auth.password.required"
  | "auth.password.invalid"
  | "auth.register.passwordMismatch"
  | "auth.agreement.required";

/** 字段错误状态：协议勾选错误单列，其余以字段级文案呈现在各输入框下。 */
export type AuthFormErrors = Partial<
  Record<
    "account" | "username" | "password" | "confirmPassword" | "agreement",
    AuthMessageKey
  >
>;

/**
 * 登录表单提交门 schema（客户端提交前校验用；登录经 Better Auth，无
 * 服务端复验端点）：空值报必填，格式不过报无效。
 */
export const loginFormSchema = z.object({
  account: z
    .string({ message: "auth.account.required" })
    .min(1, { message: "auth.account.required" })
    .regex(USERNAME_RE, { message: "auth.account.invalid" }),
  password: z
    .string({ message: "auth.password.required" })
    .min(1, { message: "auth.password.required" })
    .refine((value) => PASSWORD_RE.test(value), {
      message: "auth.password.invalid",
    }),
});

/**
 * 注册表单 schema（客户端提交门与统一接口切面复验共用）：规则与文案 key
 * 与 src/validation/auth 的常量/正则同源引用，勿复写字面值；密码为空报
 * 必填，格式不过报无效。
 */
export const registerFormSchema = z
  .object({
    username: z
      .string({ message: "auth.account.invalid" })
      .regex(USERNAME_RE, { message: "auth.account.invalid" }),
    password: z
      .string({ message: "auth.password.required" })
      .refine((value) => value !== "", { message: "auth.password.required" })
      .refine((value) => PASSWORD_RE.test(value), {
        message: "auth.password.invalid",
      }),
    confirmPassword: z.string({ message: "auth.account.invalid" }),
    agreementAccepted: z.boolean({ message: "auth.agreement.required" }),
  })
  // 密码本身非法时由 password 字段报错,确认字段不重复报(与客户端提交前校验判定一致)
  .refine(
    (value) =>
      !PASSWORD_RE.test(value.password) ||
      (value.confirmPassword !== "" &&
        value.confirmPassword === value.password),
    {
      path: ["confirmPassword"],
      message: "auth.register.passwordMismatch",
    },
  )
  .refine((value) => value.agreementAccepted, {
    path: ["agreement"],
    message: "auth.agreement.required",
  });

/**
 * 账户域请求(入参)契约单一真源:账户名与密码业务规则的唯一来源(长度
 * 常量、正则、登录/注册提交门与服务端复验 schema),消费方一律引用本文件
 * 导出的常量、正则与 schema,界限禁止复写。本域暂无响应契约文件:统一接口
 * 收编范围仅注册端点且成功无载荷,登录/登出/会话走 Better Auth 托管端点
 * 不经契约切面。规则浮层实时拆解(纯 UI 呈现)居于 features/auth/
 * useClientScreen.ts,经导入同源衔接,勿回流本文件。
 */
import { z } from "zod";

/** 账户名长度下界：最短字符数，正则量词、规则浮层与 Better Auth 插件配置同源引用。 */
export const USERNAME_MIN_LENGTH = 1;

/** 账户名长度上界：最长字符数，同源引用范围同下界。 */
export const USERNAME_MAX_LENGTH = 16;

/** 密码长度下界：最短位数，正则量词、规则浮层与 Better Auth 配置同源引用。 */
export const PASSWORD_MIN_LENGTH = 8;

/** 密码长度上界：最长位数，同源引用范围同下界。 */
export const PASSWORD_MAX_LENGTH = 20;

/** 账户名合法域：中文/字母/数字/下划线，长度界限由上述常量注入（区分大小写；输入不过滤）。 */
export const USERNAME_RE = new RegExp(
  `^[一-龥A-Za-z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`,
);

/** 密码域：字母与数字同时存在，长度界限由上述常量注入。 */
export const PASSWORD_RE = new RegExp(
  `^(?=.*[A-Za-z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},${PASSWORD_MAX_LENGTH}}$`,
);

/**
 * 校验错误承载的 messageKey 全集（与上方校验函数的返回键一一对应）。
 * 显式枚举而非推断，键清单变更时在此同步；账户名无独立注册键，
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
 * 与上方常量/正则同源引用，勿复写字面值；密码为空报必填，格式不过报无效。
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

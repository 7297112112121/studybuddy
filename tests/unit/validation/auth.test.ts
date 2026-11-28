import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  loginFormSchema,
  registerFormSchema,
} from "@/app/api/auth/request";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RE,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_RE,
} from "@/validation/auth";

/** 取 safeParse 失败 issues 的快捷断言（zod message 即 i18n key）。 */
function issuesOf(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues;
}

function hasIssue(
  issues: { path: PropertyKey[]; message: string }[],
  field: string,
  message: string,
): boolean {
  return issues.some((i) => i.path.includes(field) && i.message === message);
}

describe("规则长度常量", () => {
  it("长度界限与产品规则字面值一致，改动常量即有意变更规则，须同步本测试", () => {
    expect(USERNAME_MIN_LENGTH).toBe(1);
    expect(USERNAME_MAX_LENGTH).toBe(16);
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(20);
  });
});

describe("USERNAME_RE", () => {
  it("接受中文、字母、数字、下划线组合的 1-16 位账户名", () => {
    expect(USERNAME_RE.test("zhang_san")).toBe(true);
    expect(USERNAME_RE.test("张三")).toBe(true);
    expect(USERNAME_RE.test("Alice")).toBe(true);
    expect(USERNAME_RE.test("a1_")).toBe(true);
  });

  it("拒绝含空格或特殊字符的账户名", () => {
    expect(USERNAME_RE.test("zhang san!")).toBe(false);
  });

  it("拒绝超过 16 位的账户名", () => {
    expect(USERNAME_RE.test("abcdefghijklmnopq")).toBe(false);
  });

  it("拒绝含 @ 的账户名", () => {
    expect(USERNAME_RE.test("name@mail.com")).toBe(false);
  });

  it("拒绝空字符串", () => {
    expect(USERNAME_RE.test("")).toBe(false);
  });
});

describe("PASSWORD_RE", () => {
  it("接受字母+数字组合的 8-20 位密码", () => {
    expect(PASSWORD_RE.test("abcd1234")).toBe(true);
    expect(PASSWORD_RE.test("a1234567")).toBe(true);
  });

  it("拒绝纯数字密码", () => {
    expect(PASSWORD_RE.test("12345678")).toBe(false);
  });

  it("拒绝纯字母密码", () => {
    expect(PASSWORD_RE.test("abcdefgh")).toBe(false);
  });

  it("拒绝不足 8 位的密码", () => {
    expect(PASSWORD_RE.test("1234567")).toBe(false);
  });

  it("拒绝超过 20 位的密码", () => {
    expect(PASSWORD_RE.test("abcd12345678901234567")).toBe(false);
  });
});

describe("loginFormSchema（登录提交门）", () => {
  const validBase = { account: "zhang_san", password: "abcd1234" } as const;

  it("合法登录入参通过", () => {
    expect(() => loginFormSchema.parse(validBase)).not.toThrow();
  });

  it("账户名为空 → auth.account.required", () => {
    const issues = issuesOf(loginFormSchema, { ...validBase, account: "" });
    expect(hasIssue(issues, "account", "auth.account.required")).toBe(true);
  });

  it("账户名格式非法 → auth.account.invalid", () => {
    const issues = issuesOf(loginFormSchema, {
      ...validBase,
      account: "zhang san!",
    });
    expect(hasIssue(issues, "account", "auth.account.invalid")).toBe(true);
  });

  it("密码为空 → auth.password.required", () => {
    const issues = issuesOf(loginFormSchema, { ...validBase, password: "" });
    expect(hasIssue(issues, "password", "auth.password.required")).toBe(true);
  });

  it("密码强度不足 → auth.password.invalid", () => {
    const issues = issuesOf(loginFormSchema, {
      ...validBase,
      password: "12345678",
    });
    expect(hasIssue(issues, "password", "auth.password.invalid")).toBe(true);
  });
});

describe("registerFormSchema（注册提交门与端点复验共用）", () => {
  const validBase = {
    username: "zhang_san",
    password: "abcd1234",
    confirmPassword: "abcd1234",
    agreementAccepted: true,
  } as const;

  it("合法注册入参通过", () => {
    expect(() => registerFormSchema.parse(validBase)).not.toThrow();
  });

  it("账户名格式非法 → auth.account.invalid", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      username: "zhang san!",
    });
    expect(hasIssue(issues, "username", "auth.account.invalid")).toBe(true);
  });

  it("密码为空 → auth.password.required", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      password: "",
      confirmPassword: "",
    });
    expect(hasIssue(issues, "password", "auth.password.required")).toBe(true);
  });

  it("密码强度不足 → auth.password.invalid", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(hasIssue(issues, "password", "auth.password.invalid")).toBe(true);
  });

  it("确认密码为空视为不一致 → auth.register.passwordMismatch", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      confirmPassword: "",
    });
    expect(
      hasIssue(issues, "confirmPassword", "auth.register.passwordMismatch"),
    ).toBe(true);
  });

  it("确认密码与密码不一致 → auth.register.passwordMismatch", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      confirmPassword: "abcd1235",
    });
    expect(
      hasIssue(issues, "confirmPassword", "auth.register.passwordMismatch"),
    ).toBe(true);
  });

  it("未勾选协议 → auth.agreement.required", () => {
    const issues = issuesOf(registerFormSchema, {
      ...validBase,
      agreementAccepted: false,
    });
    expect(hasIssue(issues, "agreement", "auth.agreement.required")).toBe(true);
  });

  it("多字段同时错误逐一报告", () => {
    const issues = issuesOf(registerFormSchema, {
      username: "zhang san!",
      password: "abcd1234",
      confirmPassword: "xyz",
      agreementAccepted: false,
    });
    expect(hasIssue(issues, "username", "auth.account.invalid")).toBe(true);
    expect(
      hasIssue(issues, "confirmPassword", "auth.register.passwordMismatch"),
    ).toBe(true);
    expect(hasIssue(issues, "agreement", "auth.agreement.required")).toBe(true);
  });
});

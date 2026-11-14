import { describe, expect, it } from "vitest";

import {
  EMAIL_RE,
  PASSWORD_RE,
  PHONE_RE,
  validateAccount,
  validatePassword,
  validateRegisterForm,
} from "../../src/modules/auth/validators";

describe("PHONE_RE", () => {
  it("接受合法 11 位手机号", () => {
    expect(PHONE_RE.test("13800138000")).toBe(true);
    expect(PHONE_RE.test("19912345678")).toBe(true);
  });

  it("拒绝 10 位号码", () => {
    expect(PHONE_RE.test("1380013800")).toBe(false);
  });

  it("拒绝首位为 2 的号码", () => {
    expect(PHONE_RE.test("23800138000")).toBe(false);
  });

  it("拒绝 1x 号段之外的号段", () => {
    expect(PHONE_RE.test("12345678901")).toBe(false);
  });

  it("拒绝含空格的号码", () => {
    expect(PHONE_RE.test("138 0013 8000")).toBe(false);
    expect(PHONE_RE.test("1380013800 ")).toBe(false);
  });
});

describe("EMAIL_RE", () => {
  it("接受合法邮箱", () => {
    expect(EMAIL_RE.test("name@mail.com")).toBe(true);
  });

  it("拒绝无后缀的邮箱", () => {
    expect(EMAIL_RE.test("abc@mail")).toBe(false);
  });

  it("拒绝含空格的邮箱", () => {
    expect(EMAIL_RE.test("a b@mail.com")).toBe(false);
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

describe("validateAccount", () => {
  it("空字符串返回 auth.account.required", () => {
    expect(validateAccount("")).toEqual({
      ok: false,
      messageKey: "auth.account.required",
    });
  });

  it("格式错误的手机号返回 auth.account.invalid", () => {
    expect(validateAccount("1380013800")).toEqual({
      ok: false,
      messageKey: "auth.account.invalid",
    });
  });

  it("格式错误的邮箱返回 auth.account.invalid", () => {
    expect(validateAccount("abc@mail")).toEqual({
      ok: false,
      messageKey: "auth.account.invalid",
    });
  });

  it("合法手机号返回 kind: phone", () => {
    expect(validateAccount("13800138000")).toEqual({
      ok: true,
      kind: "phone",
    });
  });

  it("合法邮箱返回 kind: email", () => {
    expect(validateAccount("name@mail.com")).toEqual({
      ok: true,
      kind: "email",
    });
  });
});

describe("validatePassword", () => {
  it("空字符串返回 auth.password.required", () => {
    expect(validatePassword("")).toEqual({
      ok: false,
      messageKey: "auth.password.required",
    });
  });

  it("不满足强度规则返回 auth.password.invalid", () => {
    expect(validatePassword("12345678")).toEqual({
      ok: false,
      messageKey: "auth.password.invalid",
    });
  });

  it("合法密码返回 ok: true", () => {
    expect(validatePassword("abcd1234")).toEqual({ ok: true });
  });
});

describe("validateRegisterForm", () => {
  it("手机号格式错误返回 phoneInvalid", () => {
    expect(
      validateRegisterForm({
        phone: "1380013800",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: true,
      }),
    ).toEqual({ phone: "auth.register.phoneInvalid" });
  });

  it("密码为空返回 auth.password.required", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "",
        confirmPassword: "",
        agreementAccepted: true,
      }),
    ).toEqual({ password: "auth.password.required" });
  });

  it("密码强度不足返回 auth.password.invalid", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "12345678",
        confirmPassword: "12345678",
        agreementAccepted: true,
      }),
    ).toEqual({ password: "auth.password.invalid" });
  });

  it("确认密码为空视为不一致（R8）", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "abcd1234",
        confirmPassword: "",
        agreementAccepted: true,
      }),
    ).toEqual({ confirmPassword: "auth.register.passwordMismatch" });
  });

  it("确认密码与密码不一致返回 passwordMismatch", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "abcd1234",
        confirmPassword: "abcd1235",
        agreementAccepted: true,
      }),
    ).toEqual({ confirmPassword: "auth.register.passwordMismatch" });
  });

  it("未勾选协议返回 auth.agreement.required", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: false,
      }),
    ).toEqual({ agreement: "auth.agreement.required" });
  });

  it("多字段同时错误合并返回同一对象", () => {
    expect(
      validateRegisterForm({
        phone: "1380013800",
        password: "abcd1234",
        confirmPassword: "xyz",
        agreementAccepted: false,
      }),
    ).toEqual({
      phone: "auth.register.phoneInvalid",
      confirmPassword: "auth.register.passwordMismatch",
      agreement: "auth.agreement.required",
    });
  });

  it("全合法返回 null", () => {
    expect(
      validateRegisterForm({
        phone: "13800138000",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: true,
      }),
    ).toBeNull();
  });
});

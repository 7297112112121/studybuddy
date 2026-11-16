import { describe, expect, it } from "vitest";

import {
  PASSWORD_RE,
  USERNAME_RE,
  validateAccount,
  validatePassword,
  validateRegisterForm,
} from "../../src/modules/auth/validators";

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

describe("validateAccount", () => {
  it("空字符串返回 auth.account.required", () => {
    expect(validateAccount("")).toEqual({
      ok: false,
      messageKey: "auth.account.required",
    });
  });

  it("含空格或特殊字符的账户名返回 auth.account.invalid", () => {
    expect(validateAccount("zhang san!")).toEqual({
      ok: false,
      messageKey: "auth.account.invalid",
    });
  });

  it("超过 16 位的账户名返回 auth.account.invalid", () => {
    expect(validateAccount("abcdefghijklmnopq")).toEqual({
      ok: false,
      messageKey: "auth.account.invalid",
    });
  });

  it("含 @ 的账户名返回 auth.account.invalid", () => {
    expect(validateAccount("name@mail.com")).toEqual({
      ok: false,
      messageKey: "auth.account.invalid",
    });
  });

  it("合法账户名返回 ok: true 且无 kind 字段", () => {
    const result = validateAccount("zhang_san");
    expect(result).toEqual({ ok: true });
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
  it("账户名格式错误返回 auth.account.invalid", () => {
    expect(
      validateRegisterForm({
        username: "zhang san!",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: true,
      }),
    ).toEqual({ username: "auth.account.invalid" });
  });

  it("密码为空返回 auth.password.required", () => {
    expect(
      validateRegisterForm({
        username: "zhang_san",
        password: "",
        confirmPassword: "",
        agreementAccepted: true,
      }),
    ).toEqual({ password: "auth.password.required" });
  });

  it("密码强度不足返回 auth.password.invalid", () => {
    expect(
      validateRegisterForm({
        username: "zhang_san",
        password: "12345678",
        confirmPassword: "12345678",
        agreementAccepted: true,
      }),
    ).toEqual({ password: "auth.password.invalid" });
  });

  it("确认密码为空视为不一致（R8）", () => {
    expect(
      validateRegisterForm({
        username: "zhang_san",
        password: "abcd1234",
        confirmPassword: "",
        agreementAccepted: true,
      }),
    ).toEqual({ confirmPassword: "auth.register.passwordMismatch" });
  });

  it("确认密码与密码不一致返回 passwordMismatch", () => {
    expect(
      validateRegisterForm({
        username: "zhang_san",
        password: "abcd1234",
        confirmPassword: "abcd1235",
        agreementAccepted: true,
      }),
    ).toEqual({ confirmPassword: "auth.register.passwordMismatch" });
  });

  it("未勾选协议返回 auth.agreement.required", () => {
    expect(
      validateRegisterForm({
        username: "zhang_san",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: false,
      }),
    ).toEqual({ agreement: "auth.agreement.required" });
  });

  it("多字段同时错误合并返回同一对象", () => {
    expect(
      validateRegisterForm({
        username: "zhang san!",
        password: "abcd1234",
        confirmPassword: "xyz",
        agreementAccepted: false,
      }),
    ).toEqual({
      username: "auth.account.invalid",
      confirmPassword: "auth.register.passwordMismatch",
      agreement: "auth.agreement.required",
    });
  });

  it("全合法返回 null", () => {
    expect(
      validateRegisterForm({
        username: "xue_sheng01",
        password: "abcd1234",
        confirmPassword: "abcd1234",
        agreementAccepted: true,
      }),
    ).toBeNull();
  });
});

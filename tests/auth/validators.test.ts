import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RE,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_RE,
  validateAccount,
  validatePassword,
} from "../../src/auth/validators";

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

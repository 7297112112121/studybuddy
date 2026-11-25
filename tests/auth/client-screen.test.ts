/**
 * 客户端页面校验纯函数（features/auth/useClientScreen.ts 模块作用域导出）：
 * 注册表单提交前校验与规则浮层实时拆解。
 *
 * 规则拆解必须与校验单一来源（USERNAME_RE / PASSWORD_RE）严格同真同假：
 * 全部通过 ⇔ validateAccount / validatePassword 通过。规则文案为页面
 * 静态文案（与 AccountField 的 Label/hint 同约定），不入 auth.json
 * （messages 锁定测试锁 12 叶键结构）。
 */
import { describe, expect, it } from "vitest";

import { validateAccount, validatePassword } from "../../src/auth/validators";
import {
  accountRuleStates,
  confirmPasswordRuleStates,
  passwordRuleStates,
  validateRegisterForm,
} from "../../src/features/auth/useClientScreen";

/** 全部规则通过 ⇔ 校验函数通过（同真同假不变量）。 */
function expectConsistency(
  value: string,
  rules: { label: string; passed: boolean }[],
  valid: boolean,
): void {
  expect(rules.every((rule) => rule.passed)).toBe(valid);
}

describe("accountRuleStates（账户名规则拆解）", () => {
  it("合法值 zhang_san → 两条规则全部通过，与 validateAccount 同真", () => {
    const rules = accountRuleStates("zhang_san");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
    expectConsistency("zhang_san", rules, validateAccount("zhang_san").ok);
  });

  it("空值 → 两条规则全部未过（长度与字符集均失败）", () => {
    const rules = accountRuleStates("");
    expect(rules.map((rule) => rule.passed)).toEqual([false, false]);
  });

  it("zhang san!（含空格与感叹号）→ 长度过、字符集未过", () => {
    const rules = accountRuleStates("zhang san!");
    expect(rules.map((rule) => rule.passed)).toEqual([true, false]);
    expectConsistency("zhang san!", rules, validateAccount("zhang san!").ok);
  });

  it("17 位长合法字符 → 长度未过、字符集过；与 validateAccount 同假", () => {
    const rules = accountRuleStates("abcdefghijklmnopq");
    expect(rules.map((rule) => rule.passed)).toEqual([false, true]);
    expectConsistency(
      "abcdefghijklmnopq",
      rules,
      validateAccount("abcdefghijklmnopq").ok,
    );
  });

  it("数字开头 12345678 → 全部通过（本仓规则无首字符限制）", () => {
    const rules = accountRuleStates("12345678");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
  });
});

describe("passwordRuleStates（密码规则拆解）", () => {
  it("合法值 a1234567 → 两条规则全部通过，与 validatePassword 同真", () => {
    const rules = passwordRuleStates("a1234567");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
    expectConsistency("a1234567", rules, validatePassword("a1234567").ok);
  });

  it("空值 → 两条规则全部未过", () => {
    const rules = passwordRuleStates("");
    expect(rules.map((rule) => rule.passed)).toEqual([false, false]);
  });

  it("abcdefgh（无数字）→ 长度过、字母数字组合未过", () => {
    const rules = passwordRuleStates("abcdefgh");
    expect(rules.map((rule) => rule.passed)).toEqual([true, false]);
    expectConsistency("abcdefgh", rules, validatePassword("abcdefgh").ok);
  });

  it("a123456（7 位）→ 长度未过、组合过；与 validatePassword 同假", () => {
    const rules = passwordRuleStates("a123456");
    expect(rules.map((rule) => rule.passed)).toEqual([false, true]);
    expectConsistency("a123456", rules, validatePassword("a123456").ok);
  });
});

describe("confirmPasswordRuleStates", () => {
  it("确认密码非空且与 password 一致时 passed", () => {
    expect(confirmPasswordRuleStates("abcd1234", "abcd1234")).toEqual([
      { label: "与第一次输入一致", passed: true },
    ]);
  });

  it("确认密码为空视为不一致（与 validateRegisterForm 同语义）", () => {
    expect(confirmPasswordRuleStates("abcd1234", "")).toEqual([
      { label: "与第一次输入一致", passed: false },
    ]);
  });

  it("确认密码与 password 不一致时 passed 为 false", () => {
    expect(confirmPasswordRuleStates("abcd1234", "abcd1235")).toEqual([
      { label: "与第一次输入一致", passed: false },
    ]);
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

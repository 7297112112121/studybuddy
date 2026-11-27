/**
 * 规则浮层实时拆解（features/auth/utils.ts 模块作用域导出）。
 *
 * 规则拆解必须与登录表单 schema（loginFormSchema）严格同真同假：
 * 全部通过 ⇔ schema 对应字段通过。规则文案为页面静态文案（与 AccountField
 * 的 Label/hint 同约定），不入 auth.json（messages 锁定测试锁 12 叶键结构）。
 */
import { describe, expect, it } from "vitest";

import { loginFormSchema } from "../../src/app/api/auth/request";
import {
  accountRuleStates,
  confirmPasswordRuleStates,
  passwordRuleStates,
} from "../../src/features/auth/utils";

/** 账户名规则全过 ⇔ 登录 schema 账户名字段通过（密码侧用合法固定值隔离）。 */
function accountSchemaOk(account: string): boolean {
  return loginFormSchema.safeParse({
    account,
    password: "a1234567",
  }).success;
}

/** 密码规则全过 ⇔ 登录 schema 密码字段通过（账户名侧用合法固定值隔离）。 */
function passwordSchemaOk(password: string): boolean {
  return loginFormSchema.safeParse({
    account: "zhang_san",
    password,
  }).success;
}

/** 全部规则通过 ⇔ schema 判定（同真同假不变量）。 */
function expectConsistency(
  rules: { label: string; passed: boolean }[],
  schemaOk: boolean,
): void {
  expect(rules.every((rule) => rule.passed)).toBe(schemaOk);
}

describe("accountRuleStates（账户名规则拆解）", () => {
  it("合法值 zhang_san → 两条规则全部通过，与登录 schema 同真", () => {
    const rules = accountRuleStates("zhang_san");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
    expectConsistency(rules, accountSchemaOk("zhang_san"));
  });

  it("空值 → 两条规则全部未过（长度与字符集均失败）", () => {
    const rules = accountRuleStates("");
    expect(rules.map((rule) => rule.passed)).toEqual([false, false]);
    expectConsistency(rules, accountSchemaOk(""));
  });

  it("zhang san!（含空格与感叹号）→ 长度过、字符集未过", () => {
    const rules = accountRuleStates("zhang san!");
    expect(rules.map((rule) => rule.passed)).toEqual([true, false]);
    expectConsistency(rules, accountSchemaOk("zhang san!"));
  });

  it("17 位长合法字符 → 长度未过、字符集过；与登录 schema 同假", () => {
    const rules = accountRuleStates("abcdefghijklmnopq");
    expect(rules.map((rule) => rule.passed)).toEqual([false, true]);
    expectConsistency(rules, accountSchemaOk("abcdefghijklmnopq"));
  });

  it("数字开头 12345678 → 全部通过（本仓规则无首字符限制）", () => {
    const rules = accountRuleStates("12345678");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
    expectConsistency(rules, accountSchemaOk("12345678"));
  });
});

describe("passwordRuleStates（密码规则拆解）", () => {
  it("合法值 a1234567 → 两条规则全部通过，与登录 schema 同真", () => {
    const rules = passwordRuleStates("a1234567");
    expect(rules.map((rule) => rule.passed)).toEqual([true, true]);
    expectConsistency(rules, passwordSchemaOk("a1234567"));
  });

  it("空值 → 两条规则全部未过", () => {
    const rules = passwordRuleStates("");
    expect(rules.map((rule) => rule.passed)).toEqual([false, false]);
    expectConsistency(rules, passwordSchemaOk(""));
  });

  it("abcdefgh（无数字）→ 长度过、字母数字组合未过", () => {
    const rules = passwordRuleStates("abcdefgh");
    expect(rules.map((rule) => rule.passed)).toEqual([true, false]);
    expectConsistency(rules, passwordSchemaOk("abcdefgh"));
  });

  it("a123456（7 位）→ 长度未过、组合过；与登录 schema 同假", () => {
    const rules = passwordRuleStates("a123456");
    expect(rules.map((rule) => rule.passed)).toEqual([false, true]);
    expectConsistency(rules, passwordSchemaOk("a123456"));
  });
});

describe("confirmPasswordRuleStates", () => {
  it("确认密码非空且与 password 一致时 passed", () => {
    expect(confirmPasswordRuleStates("abcd1234", "abcd1234")).toEqual([
      { label: "与第一次输入一致", passed: true },
    ]);
  });

  it("确认密码为空视为不一致（与注册 schema 同语义）", () => {
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

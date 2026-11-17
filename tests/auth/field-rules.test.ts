/**
 * 字段规则清单纯函数（AXY-8 UI 优化：聚焦浮层实时侦测）。
 *
 * 规则拆解必须与校验单一来源（USERNAME_RE / PASSWORD_RE）严格同真同假：
 * 全部通过 ⇔ validateAccount / validatePassword 通过。规则文案为页面
 * 静态文案（与 AccountField 的 Label/hint 同约定），不入 auth.json
 * （messages 锁定测试锁 12 叶键结构）。
 */
import { describe, expect, it } from "vitest";
import {
  accountRuleStates,
  passwordRuleStates,
  validateAccount,
  validatePassword,
} from "../../src/modules/auth/validators";

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

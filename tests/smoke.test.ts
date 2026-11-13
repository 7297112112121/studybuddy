import { describe, expect, it } from "vitest";

/**
 * 冒烟测试：纯函数断言链路（vitest runner + 断言库可用性）。
 * 仅证明测试框架落地可用，不承载任何业务语义（ADR-0012）。
 */
function add(a: number, b: number): number {
  return a + b;
}

describe("冒烟：纯函数断言", () => {
  it("add 对整数求和正确", () => {
    expect(add(1, 2)).toBe(3);
  });
});

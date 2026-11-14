/**
 * mapSignInError 单元测试（Task 7，design「modules/auth/errors.ts」契约）。
 *
 * R7 错误映射表：任一登录失败（401 凭证错误族 / 400 格式拒绝族）→
 * invalidCredentials；429 限流 → tooManyAttempts；其余（500、空值）
 * → unknown。设计依据：Task 6 实测三失败情形均为 401 +
 * INVALID_PHONE_NUMBER_OR_PASSWORD（design 开放问题 #1 闭合记录）。
 */
import { describe, expect, it } from "vitest";

import { mapSignInError } from "../../src/modules/auth/errors";

describe("mapSignInError", () => {
  it("status 401 → auth.error.invalidCredentials", () => {
    expect(mapSignInError({ status: 401 })).toBe(
      "auth.error.invalidCredentials",
    );
  });

  it("status 400 + code INVALID_PHONE_NUMBER → auth.error.invalidCredentials", () => {
    expect(mapSignInError({ status: 400, code: "INVALID_PHONE_NUMBER" })).toBe(
      "auth.error.invalidCredentials",
    );
  });

  it("status 429 → auth.error.tooManyAttempts", () => {
    expect(mapSignInError({ status: 429 })).toBe(
      "auth.error.tooManyAttempts",
    );
  });

  it("null → auth.error.unknown", () => {
    expect(mapSignInError(null)).toBe("auth.error.unknown");
  });

  it("undefined → auth.error.unknown", () => {
    expect(mapSignInError(undefined)).toBe("auth.error.unknown");
  });

  it("status 500 → auth.error.unknown", () => {
    expect(mapSignInError({ status: 500 })).toBe("auth.error.unknown");
  });
});

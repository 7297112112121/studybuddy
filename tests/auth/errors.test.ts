/**
 * mapSignInError 单元测试：任一登录失败（401 凭证错误族 / 400 格式
 * 拒绝族）→ invalidCredentials；429 限流 → tooManyAttempts；
 * 其余（500、空值）→ unknown。
 */
import { describe, expect, it } from "vitest";

import { mapSignInError } from "../../src/features/auth/useClientScreen";

describe("mapSignInError", () => {
  it("status 401 → auth.error.invalidCredentials", () => {
    expect(mapSignInError({ status: 401 })).toBe(
      "auth.error.invalidCredentials",
    );
  });

  it("status 400 → auth.error.invalidCredentials", () => {
    expect(mapSignInError({ status: 400 })).toBe(
      "auth.error.invalidCredentials",
    );
  });

  it("status 429 → auth.error.tooManyAttempts", () => {
    expect(mapSignInError({ status: 429 })).toBe("auth.error.tooManyAttempts");
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

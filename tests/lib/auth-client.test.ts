/**
 * src/lib/auth-client.ts 单元测试（Task 4，design「src/lib/auth-client.ts」契约）。
 *
 * 此处闭合 design 开放问题 #2：`authClient.signIn.phoneNumber` 方法名
 * 是否为 phoneNumberClient 实际生成的 SDK 方法（契约锚点是端点
 * POST /sign-in/phone-number，客户端方法仅是语法糖）。运行时断言其为
 * function，即证明方法名与 design 契约一致。
 */
import { describe, expect, it } from "vitest";

import { authClient } from "@/lib/auth-client";

describe("authClient（src/lib/auth-client.ts）", () => {
  it("暴露 signIn.phoneNumber 方法（开放问题 #2 运行时闭合）", () => {
    expect(typeof authClient.signIn.phoneNumber).toBe("function");
  });

  it("暴露 signOut 方法", () => {
    expect(typeof authClient.signOut).toBe("function");
  });
});

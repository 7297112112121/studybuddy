import { describe, expect, it } from "vitest";
import auth from "@/locales/zh-CN/auth.json";

/**
 * auth 命名空间 16 键文案与 design 文案表逐字对照
 * （docs/dev/AXY-8-auth/design.mdx「文案」节；E2E 断言以渲染文案为准，
 *  本测试锁定 JSON 源值：全角标点、省略号「…」、破折号「—」、ICU 占位符不得漂移）。
 */
describe("auth.json 文案与 design 文案表逐字一致", () => {
  it("account：登录账号字段", () => {
    expect(auth.account.required).toBe("请输入手机号或邮箱");
    expect(auth.account.invalid).toBe("格式不对：手机号 11 位，或 name@mail.com");
  });

  it("password：密码字段", () => {
    expect(auth.password.required).toBe("请输入密码");
    expect(auth.password.invalid).toBe("密码为 8—20 位，需含字母与数字");
  });

  it("register：注册表单校验", () => {
    expect(auth.register.phoneInvalid).toBe("请输入 11 位有效手机号");
    expect(auth.register.passwordMismatch).toBe("两次输入的密码不一致");
  });

  it("agreement：协议勾选", () => {
    expect(auth.agreement.required).toBe(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );
  });

  it("error：服务端错误映射（R7 统一文案）", () => {
    expect(auth.error.invalidCredentials).toBe("账号或密码不对");
    expect(auth.error.tooManyAttempts).toBe("操作过于频繁，请稍后再试");
    expect(auth.error.phoneRegistered).toBe("该手机号已注册，去登录");
    expect(auth.error.unknown).toBe("出了点问题，请稍后再试");
  });

  it("forgotPassword：找回密码占位", () => {
    expect(auth.forgotPassword.unavailable).toBe("找回密码功能暂未开通");
  });

  it("oauth：第三方登录占位", () => {
    expect(auth.oauth.placeholder).toBe("本期不做，仅占位");
  });

  it("summary：表单汇总（ICU，count 为占位符）", () => {
    expect(auth.summary.errors).toBe("有 {count} 项需要修改");
  });

  it("submit：提交态（省略号为 U+2026）", () => {
    expect(auth.submit.loggingIn).toBe("登录中…");
    expect(auth.submit.registering).toBe("注册中…");
  });

  it("结构：共 16 个叶子键，命名空间齐全", () => {
    expect(Object.keys(auth).sort()).toEqual(
      [
        "account",
        "agreement",
        "error",
        "forgotPassword",
        "oauth",
        "password",
        "register",
        "submit",
        "summary",
      ].sort(),
    );
    const leafCount = Object.values(auth).reduce(
      (sum, group) => sum + Object.keys(group as object).length,
      0,
    );
    expect(leafCount).toBe(16);
  });
});

/**
 * 视图级标题（auth-2 视觉重做）：右列大标题随视图切换——登录「欢迎回来」、
 * 注册「创建你的账号」。行为契约：标题只随 activeView 变化，不影响表单
 * 值/校验链（switchView 既有语义不变，此处仅断言文案呈现）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

afterEach(cleanup);

function renderAuthScreen(initialView: "login" | "register" = "login"): void {
  render(
    <NextIntlClientProvider locale="zh-CN" messages={{ auth: authMessages }}>
      <AuthScreen initialView={initialView} />
    </NextIntlClientProvider>,
  );
}

describe("视图级标题", () => {
  it("login 视图呈现「欢迎回来」", () => {
    renderAuthScreen("login");
    // getByRole 命中即存在;tagName 断言确保标题语义为 h1。
    expect(
      screen.getByRole("heading", { level: 1, name: "欢迎回来" }).tagName,
    ).toBe("H1");
  });

  it("register 视图呈现「创建你的账号」", () => {
    renderAuthScreen("register");
    expect(
      screen.getByRole("heading", { level: 1, name: "创建你的账号" }).tagName,
    ).toBe("H1");
  });
});

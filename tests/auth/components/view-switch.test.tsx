/**
 * Task 9 Step 1：AuthScreen 视图切换测试（R16）。
 *
 * 覆盖：已填值跨视图保留（表单值提升于 AuthScreen）、切换清空错误、
 * URL 经 history.replaceState 同步 /login ↔ /register（不导航）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";

afterEach(cleanup);

function renderAuthScreen(
  props: { initialView?: "login" | "register" } = {},
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ auth: authMessages }}>
      <AuthScreen initialView={props.initialView ?? "login"} />
    </NextIntlClientProvider>,
  );
}

describe("R16 视图切换", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("login 视图填入账号/密码 → 切到 register 后输入框值保留，URL 经 replaceState 同步 /register", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderAuthScreen();

    fireEvent.change(screen.getByLabelText("手机号 / 邮箱"), {
      target: { value: "13800138000" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "study2026" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "注册" }));

    expect(
      (screen.getByLabelText("手机号") as HTMLInputElement).value,
    ).toBe("13800138000");
    expect(
      (screen.getByLabelText("设置密码") as HTMLInputElement).value,
    ).toBe("study2026");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/register");
  });

  it("制造错误后切换视图 → 错误清空；底部「注册一个」链接同样可切换", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const { container } = renderAuthScreen();
    const form = container.querySelector("form");
    if (form === null) {
      throw new Error("登录视图下没有 form");
    }

    fireEvent.submit(form);
    expect(screen.getByText("请输入手机号或邮箱")).toBeDefined();
    expect(screen.getByText("有 2 项需要修改")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "注册一个" }));

    expect(screen.queryByText("请输入手机号或邮箱")).toBeNull();
    expect(screen.queryByText(/项需要修改/)).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/register");
  });

  it("register 视图经底部「去登录」切回 → URL 经 replaceState 同步 /login", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderAuthScreen({ initialView: "register" });

    fireEvent.click(screen.getByRole("button", { name: "去登录" }));

    expect(screen.getByLabelText("手机号 / 邮箱")).toBeDefined();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/login");
  });
});

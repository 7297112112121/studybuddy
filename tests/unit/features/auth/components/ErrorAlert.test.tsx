/**
 * 顶部错误提示测试(src/features/auth/components/ErrorAlert.tsx):
 * 「账户名已注册」文案呈可点击 link 臂且点击切回登录,其余 errorKey
 * 呈纯文案。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ErrorAlert from "@/features/auth/components/ErrorAlert";

afterEach(cleanup);

describe("ErrorAlert 渲染形态", () => {
  it("errorKey=usernameRegistered → 文案呈按钮臂,点击回调切回登录", () => {
    const onSwitchToLogin = vi.fn();

    render(
      <ErrorAlert
        errorKey="auth.error.usernameRegistered"
        text="该账户已注册,去登录"
        onSwitchToLogin={onSwitchToLogin}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "该账户已注册,去登录" }),
    );

    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it("errorKey=unknown → 纯文案,不呈按钮臂", () => {
    render(
      <ErrorAlert
        errorKey="auth.error.unknown"
        text="出错了,请稍后再试"
        onSwitchToLogin={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "出错了,请稍后再试" }),
    ).toBeNull();
    expect(screen.getByText("出错了,请稍后再试")).toBeDefined();
  });
});

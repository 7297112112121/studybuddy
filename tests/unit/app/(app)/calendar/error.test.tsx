/**
 * /calendar 路由错误边界组件测试:通用文案「加载失败,请重试」呈现、
 * 点击重试调用 retry()、不向用户泄漏 error.message。
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { NextIntlClientProvider } from "next-intl";

import { afterEach, describe, expect, it, vi } from "vitest";

import CalendarError from "@/app/(app)/calendar/error";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

function renderBoundary(error: unknown, retry: () => void): void {
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <CalendarError error={error} retry={retry} />
    </NextIntlClientProvider>,
  );
}

describe("CalendarErrorBoundary", () => {
  it("渲染通用文案「加载失败,请重试」与重试按钮", () => {
    renderBoundary(new Error("boom"), vi.fn());
    expect(screen.getByText("加载失败,请重试")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重试" })).toBeTruthy();
  });

  it("点击重试调用 retry()", () => {
    const retry = vi.fn();
    renderBoundary(new Error("boom"), retry);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("不泄漏 error.message 给用户", () => {
    renderBoundary(new Error("secret-db-connection-string"), vi.fn());
    expect(screen.queryByText("secret-db-connection-string")).toBeNull();
  });
});

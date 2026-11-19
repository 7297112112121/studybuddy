/**
 * /calendar 路由错误边界组件测试(AXY-23 tasks.md Task 9「失败测试」行)。
 *
 * 覆盖:E-05 逐字「加载失败,请重试」呈现、点击重试调用 reset()、
 * 不向用户泄漏 error.message。R9 的测试归属(design 开放问题 #2 假设):
 * RSC 数据流无前端请求可拦截,E2E 不注入 DB 故障,本组件测试承载。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import CalendarError from "@/app/(app)/calendar/error";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

function renderBoundary(error: Error, reset: () => void): void {
  render(
    <NextIntlClientProvider locale="zh-CN" messages={{ calendar: calendarMessages }}>
      <CalendarError error={error} reset={reset} />
    </NextIntlClientProvider>,
  );
}

describe("CalendarErrorBoundary(AXY-23 Task 9)", () => {
  it("渲染 E-05 逐字文案「加载失败,请重试」与重试按钮", () => {
    renderBoundary(new Error("boom"), vi.fn());
    expect(screen.getByText("加载失败,请重试")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重试" })).toBeTruthy();
  });

  it("点击重试调用 reset()", () => {
    const reset = vi.fn();
    renderBoundary(new Error("boom"), reset);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("不泄漏 error.message 给用户", () => {
    renderBoundary(new Error("secret-db-connection-string"), vi.fn());
    expect(screen.queryByText("secret-db-connection-string")).toBeNull();
  });
});

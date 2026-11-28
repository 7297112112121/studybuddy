/**
 * /workbench 路由错误边界组件测试:通用文案「加载失败,请重试」呈现、
 * 点击重试调用 retry()、不向用户泄漏 error.message。
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { NextIntlClientProvider } from "next-intl";

import { afterEach, describe, expect, it, vi } from "vitest";

import WorkbenchError from "@/app/(app)/workbench/error";
import workbenchMessages from "@/locales/zh-CN/workbench.json";

afterEach(cleanup);

function renderBoundary(error: unknown, retry: () => void): void {
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ workbench: workbenchMessages }}
    >
      <WorkbenchError error={error} retry={retry} />
    </NextIntlClientProvider>,
  );
}

describe("WorkbenchErrorBoundary", () => {
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
    renderBoundary(new Error("secret-render-error"), vi.fn());
    expect(screen.queryByText("secret-render-error")).toBeNull();
  });
});

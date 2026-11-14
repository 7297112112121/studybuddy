/**
 * Task 11 Step 1：AuthRedirect 行为测试（R12 的跳转半边）。
 *
 * 契约（design「UI 与组件」）：已登录访问 (auth) 路由时布局渲染 AuthRedirect——
 * - history.length > 1（有来路）→ router.back() 回到来源页；
 * - history.length <= 1（直接打开/书签）→ router.replace(ROUTES.workbench)。
 *
 * jsdom 的 history.length 不可直接赋值（只读访问器），经
 * Object.defineProperty 在实例上以可配置属性覆盖，afterEach 删除还原。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AuthRedirect from "../../../src/modules/auth/components/AuthRedirect";

const routerBack = vi.hoisted(() => vi.fn<() => void>());
const routerReplace = vi.hoisted(() => vi.fn<(path: string) => void>());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: routerBack, replace: routerReplace }),
}));

function setHistoryLength(length: number): void {
  Object.defineProperty(window.history, "length", {
    configurable: true,
    value: length,
  });
}

afterEach(() => {
  cleanup();
  // 删除实例上的覆盖定义，还原 jsdom 原生 length（defineProperty 声明为 configurable）
  delete (window.history as unknown as { length?: number }).length;
});

beforeEach(() => {
  routerBack.mockClear();
  routerReplace.mockClear();
});

describe("R12 AuthRedirect 跳转策略", () => {
  it("history.length=2（有来路）→ router.back() 被调，不 replace", () => {
    setHistoryLength(2);

    render(<AuthRedirect />);

    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("history.length=1（直接打开/书签，无来路）→ router.replace('/workbench')", () => {
    setHistoryLength(1);

    render(<AuthRedirect />);

    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
    expect(routerBack).not.toHaveBeenCalled();
  });
});

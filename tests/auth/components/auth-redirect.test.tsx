/**
 * Task 11 Step 1：AuthRedirect 行为测试（R12 的跳转半边）。
 *
 * 契约（design「UI 与组件」）：已登录访问 (auth) 路由时布局渲染 AuthRedirect——
 * - history.length > 2（有来路）→ router.back() 回到来源页；
 * - history.length <= 2（直接打开/书签）→ router.replace(ROUTES.workbench)。
 *
 * 阈值取 2 的原因（Task 12 E2E 实测）：浏览器新标签页直开任意 URL 时，
 * 初始 about:blank 占据一个历史槽位，首次导航后 history.length 即为 2；
 * 按 > 1 判定会使「无来路」分支在真实浏览器中不可达。
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
  it("history.length=3（有来路，站内导航后）→ router.back() 被调，不 replace", () => {
    setHistoryLength(3);

    render(<AuthRedirect />);

    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("history.length=2（新标签页直开，about:blank 占一槽位，无来路）→ router.replace('/workbench')", () => {
    setHistoryLength(2);

    render(<AuthRedirect />);

    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
    expect(routerBack).not.toHaveBeenCalled();
  });

  it("history.length=1（无历史极值，防御分支）→ router.replace('/workbench')", () => {
    setHistoryLength(1);

    render(<AuthRedirect />);

    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
    expect(routerBack).not.toHaveBeenCalled();
  });
});

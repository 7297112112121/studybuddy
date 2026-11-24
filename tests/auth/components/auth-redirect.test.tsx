/**
 * Task 11 Step 1：AuthRedirect 行为测试（R12 的跳转半边）。
 *
 * 契约（数据流向评审裁决 5a 守卫客户端化后修订）：已登录访问 (auth) 路由时
 * 布局渲染 AuthRedirect——统一 router.replace(ROUTES.workbench)。
 *
 * 原「有来路 → router.back()」策略废除：守卫客户端化后 (auth) 布局随会话
 * store 反应式翻转，重登场景下 back 会循环退栈至 about:blank（2026-11-24
 * e2e 实测）。无论历史形态如何，落点一律工作台。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import AuthRedirect from "../../../src/features/auth/components/AuthRedirect";

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
  it.each([3, 2, 1])(
    "history.length=%i（有来路/直开/极值，一律 replace）→ router.replace('/workbench')，不 back",
    (length) => {
      setHistoryLength(length);

      render(<AuthRedirect />);

      expect(routerReplace).toHaveBeenCalledTimes(1);
      expect(routerReplace).toHaveBeenCalledWith("/workbench");
      expect(routerBack).not.toHaveBeenCalled();
    },
  );
});

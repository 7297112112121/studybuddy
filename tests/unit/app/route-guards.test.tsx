/**
 * 路由组守卫与退出按钮测试（R12 / B6 / R11；数据流向评审裁决 5a 换装——
 * 守卫已客户端化，服务端 redirect 语义废除）。
 *
 * 布局为服务端壳，客户端守卫由会话门（SessionGate）承载——直接 render：
 * - `better-auth/react` 的 useStore 桩接：注入会话态（data/isPending），
 *   authClient（nanostores 会话 store）即会话真源；
 * - `next/navigation`：useRouter.replace 桩接（客户端守卫的承接动作）；
 * - `@/stores/auth-client`：signOut 注入（Task 10 裁决：失败 resolve
 *   `{ data: null, error }` 而非 reject——两种形态都覆盖）。
 *
 * 断言形态：未登录时受保护内容不进文档（会话门渲染 null）且
 * replace('/login') 被调；(auth) 布局已登录时 children 不在、门占位（正在
 * 进入）在，replace 回工作台。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { AuthSession } from "@/auth";
import AuthLayout from "@/app/(auth)/layout";
import AppLayout from "@/app/(app)/layout";
import SignOutButton from "@/features/auth/components/SignOutButton";

// 会话 store 桩态：用例按需改写 data/isPending
const sessionState = vi.hoisted(() => ({
  data: null as AuthSession | null,
  isPending: true,
}));
const routerBack = vi.hoisted(() => vi.fn<() => void>());
const routerReplace = vi.hoisted(() => vi.fn<(path: string) => void>());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("better-auth/react", () => ({
  useStore: () => sessionState,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: routerBack, replace: routerReplace }),
}));
vi.mock("@/stores/auth-client", () => ({
  authClient: { signOut },
}));

const session: AuthSession = {
  user: { id: "user-1", name: "studybuddy_u1", username: "studybuddy_u1" },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-12-31T00:00:00Z"),
  },
};

function Children(): ReactElement {
  return <div data-testid="guarded-children">受保护内容</div>;
}

const children: ReactNode = <Children />;

// Next 16 typegen 的 LayoutProps 对静态路由也要求 params（Promise<{}>）
const layoutProps = { children, params: Promise.resolve({}) } as const;

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
  sessionState.data = null;
  sessionState.isPending = false;
  routerBack.mockClear();
  routerReplace.mockClear();
  signOut.mockReset();
});

describe("R12：(auth) 布局守卫（客户端化）", () => {
  it("未登录 → children 渲染，不出现 AuthRedirect", () => {
    sessionState.data = null;
    render(<AuthLayout {...layoutProps} />);

    expect(screen.getByTestId("guarded-children")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("已登录 → children（表单位置）不在文档中，门占位在且 replace 回工作台", async () => {
    sessionState.data = session;
    render(<AuthLayout {...layoutProps} />);

    expect(screen.queryByTestId("guarded-children")).toBeNull();
    expect(screen.getByRole("status")).toBeDefined();
    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/workbench");
    });
  });

  it.each([3, 2, 1])(
    "已登录 history.length=%i（有来路/直开/极值）→ 一律 replace('/workbench')，不 back",
    (length) => {
      setHistoryLength(length);
      sessionState.data = session;
      render(<AuthLayout {...layoutProps} />);

      expect(routerReplace).toHaveBeenCalledTimes(1);
      expect(routerReplace).toHaveBeenCalledWith("/workbench");
      expect(routerBack).not.toHaveBeenCalled();
    },
  );

  it("会话判定中（isPending）→ 不渲染任何内容", () => {
    sessionState.isPending = true;
    render(<AuthLayout {...layoutProps} />);

    expect(screen.queryByTestId("guarded-children")).toBeNull();
  });
});

describe("B6：(app) 布局守卫（客户端拦截）", () => {
  it("未登录 → replace('/login') 被调，children 不进文档", async () => {
    sessionState.data = null;
    render(<AppLayout {...layoutProps} />);

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByTestId("guarded-children")).toBeNull();
  });

  it("已登录 → children 渲染，不触发 replace", () => {
    sessionState.data = session;
    render(<AppLayout {...layoutProps} />);

    expect(screen.getByTestId("guarded-children")).toBeDefined();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("会话判定中（isPending）→ 不渲染受保护内容、不提前跳转", () => {
    sessionState.isPending = true;
    render(<AppLayout {...layoutProps} />);

    expect(screen.queryByTestId("guarded-children")).toBeNull();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("R11：SignOutButton 退出流程", () => {
  it("点击 → authClient.signOut 被调 → router.replace('/login')", async () => {
    signOut.mockResolvedValue({ data: null, error: null });

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("signOut 失败 resolve { data: null, error }（Task 10 裁决形态）→ 仍强制 replace('/login')", async () => {
    signOut.mockResolvedValue({
      data: null,
      error: { code: "UNKNOWN_ERROR", message: "boom", status: 500 },
    });

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("signOut 真异常 reject → 仍 replace('/login')", async () => {
    signOut.mockRejectedValue(new Error("network down"));

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith("/login");
    });
  });
});

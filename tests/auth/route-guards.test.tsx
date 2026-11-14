/**
 * Task 11 Step 1：路由组守卫与退出按钮测试（R12 / B6 / R11）。
 *
 * 布局是 async 服务端组件——测试直接调用组件函数取回 JSX 元素再渲染：
 * `const ui = await AuthLayout({ children }); render(ui)`。
 *
 * mock 策略：
 * - `@/modules/auth` 顶入口整体替换：getCurrentSession 注入会话桩，
 *   AuthRedirect 经工厂内动态 import 换入真实组件（布局渲染行为真实走通）；
 * - `next/navigation`：redirect 按 Next 语义 throw（NEXT_REDIRECT），
 *   useRouter 给 AuthRedirect / SignOutButton 桩接；
 * - `@/lib/auth-client`：signOut 注入（Task 10 裁决：失败 resolve
 *   `{ data: null, error }` 而非 reject——两种形态都覆盖）。
 *
 * B6 断言形态：(app) 布局未登录时 redirect 以 '/login' 抛出、布局函数
 * reject——children 元素从未被产出，受保护内容不可能进入响应/文档。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { AuthSession } from "@/modules/auth";
import AuthLayout from "@/app/(auth)/layout";
import AppLayout from "@/app/(app)/layout";
import SignOutButton from "@/modules/auth/components/SignOutButton";

const getCurrentSession = vi.hoisted(
  () => vi.fn<() => Promise<AuthSession | null>>(),
);
const redirectMock = vi.hoisted(() =>
  vi.fn<(path: string, type?: string) => never>((path) => {
    // 模拟 next/navigation redirect 的真实语义：抛 NEXT_REDIRECT 终止渲染
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);
const routerBack = vi.hoisted(() => vi.fn<() => void>());
const routerReplace = vi.hoisted(() => vi.fn<(path: string) => void>());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", async () => {
  const { default: RealAuthRedirect } = await import(
    "@/modules/auth/components/AuthRedirect"
  );
  return {
    getCurrentSession,
    AuthRedirect: RealAuthRedirect,
  };
});
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ back: routerBack, replace: routerReplace }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut },
}));

const session: AuthSession = {
  user: { id: "user-1", name: "13800138000", phoneNumber: "13800138000" },
  session: { id: "session-1", userId: "user-1", expiresAt: new Date("2026-12-31T00:00:00Z") },
};

function Children(): ReactElement {
  return <div data-testid="guarded-children">受保护内容</div>;
}

const children: ReactNode = <Children />;

// Next 16 typegen 的 LayoutProps 对静态路由也要求 params（Promise<{}>）：
// 布局是 async 组件，测试直接调用组件函数并按其真实 Props 传参。
const layoutProps = { children, params: Promise.resolve({}) } as const;

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  getCurrentSession.mockReset();
  redirectMock.mockClear();
  routerBack.mockClear();
  routerReplace.mockClear();
  signOut.mockReset();
});

describe("R12：(auth) 布局守卫", () => {
  it("未登录（session null）→ children 渲染，不出现 AuthRedirect", async () => {
    getCurrentSession.mockResolvedValue(null);

    const ui = await AuthLayout(layoutProps);
    render(ui);

    expect(screen.getByTestId("guarded-children")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("已登录（session 存在）→ children（表单位置）不在文档中，AuthRedirect 在", async () => {
    getCurrentSession.mockResolvedValue(session);

    const ui = await AuthLayout(layoutProps);
    render(ui);

    expect(screen.queryByTestId("guarded-children")).toBeNull();
    expect(screen.getByRole("status")).toBeDefined();
  });
});

describe("B6：(app) 布局守卫（服务端未登录拦截）", () => {
  it("未登录 → redirect 以 '/login' 抛出，children 不被产出（受保护内容不进文档）", async () => {
    getCurrentSession.mockResolvedValue(null);

    await expect(AppLayout(layoutProps)).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("已登录 → children 渲染", async () => {
    getCurrentSession.mockResolvedValue(session);

    const ui = await AppLayout(layoutProps);
    render(ui);

    expect(screen.getByTestId("guarded-children")).toBeDefined();
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

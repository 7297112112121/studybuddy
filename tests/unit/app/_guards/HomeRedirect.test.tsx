/**
 * 首页分流客户端屏测试(src/app/_guards/HomeRedirect.tsx):会话判定中不
 * 跳转;就绪后按登录态 replace——未登录 → /login,已登录 → /workbench。
 * 脚手架同 route-guards.test.tsx:useStore 桩接会话态,useRouter.replace
 * 桩接承接动作。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { AuthSession } from "@/auth";
import HomeRedirect from "@/app/_guards/HomeRedirect";

// 会话 store 桩态:用例按需改写 data/isPending
const sessionState = vi.hoisted(() => ({
  data: null as AuthSession | null,
  isPending: true,
}));
const routerReplace = vi.hoisted(() => vi.fn<(path: string) => void>());

vi.mock("better-auth/react", () => ({
  useStore: () => sessionState,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));
vi.mock("@/stores/auth-client", () => ({
  authClient: { useSession: vi.fn() },
}));

const session: AuthSession = {
  user: { id: "user-1", name: "studybuddy_u1", username: "studybuddy_u1" },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date("2026-12-31T00:00:00Z"),
  },
};

afterEach(cleanup);

beforeEach(() => {
  sessionState.data = null;
  sessionState.isPending = true;
  routerReplace.mockClear();
});

describe("首页分流(HomeRedirect)", () => {
  it("会话判定中(isPending)→ 不跳转", () => {
    render(<HomeRedirect />);

    expect(routerReplace).not.toHaveBeenCalled();
  });

  it.each([
    [null, "/login"],
    [session, "/workbench"],
  ])("会话就绪(已登录=%s)→ replace('%s')", (data, expected) => {
    sessionState.data = data;
    sessionState.isPending = false;

    render(<HomeRedirect />);

    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith(expected);
  });
});

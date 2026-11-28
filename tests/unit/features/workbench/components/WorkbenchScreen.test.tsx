/**
 * /workbench 承接客户端屏测试(src/features/workbench/components/
 * WorkbenchScreen.tsx):未登录 → 空承接(布局守卫先行承接,本屏不重复
 * 判会话);已登录 → 「工作台」标题、账户名与日程日历入口在场。会话经
 * useStore 桩接(先例 route-guards.test.tsx),文案走全局 i18n 接线。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AuthSession } from "@/auth";
import WorkbenchScreen from "@/features/workbench/components/WorkbenchScreen";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import authMessages from "@/locales/zh-CN/auth.json";

const sessionState = vi.hoisted(() => ({
  data: null as AuthSession | null,
  isPending: false,
}));

vi.mock("better-auth/react", () => ({
  useStore: () => sessionState,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
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
});

/** client 侧 useTranslations 需要 Provider;屏内 calendar 命名空间 + 内嵌 SignOutButton 的 auth 命名空间。 */
function renderScreen() {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages, auth: authMessages }}
    >
      <WorkbenchScreen />
    </NextIntlClientProvider>,
  );
}

describe("WorkbenchScreen 承接", () => {
  it("未登录(data=null)→ 渲染空", () => {
    const { container } = renderScreen();

    expect(container.innerHTML).toBe("");
  });

  it("已登录 → 「工作台」标题、账户名与日程日历入口在场", () => {
    sessionState.data = session;

    renderScreen();

    expect(screen.getByText("工作台")).toBeDefined();
    expect(screen.getByTestId("session-account").textContent).toBe(
      "studybuddy_u1",
    );
    expect(screen.getByText("日程日历")).toBeDefined();
  });
});

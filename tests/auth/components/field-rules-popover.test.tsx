/**
 * 字段规则浮层（AXY-8 UI 优化）：聚焦输入框展开底层浮层容器，实时侦测
 * 输入并逐条标记规则通过（✓）/未过（×），失焦收起。
 *
 * 行为契约：
 * - 浮层仅在字段聚焦期间存在（onFocus 开、失焦收），不影响提交校验链；
 * - 规则通过态随输入实时更新（li[data-passed]）；
 * - 确认密码只展示自身规则（与第一次输入一致）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

afterEach(cleanup);

function renderAuthScreen(initialView: "login" | "register" = "login") {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ auth: authMessages }}>
      <AuthScreen initialView={initialView} />
    </NextIntlClientProvider>,
  );
}

/** 浮层内第 label 条规则的通过态标记。 */
function rulePassed(label: string): string | null {
  const item = screen
    .getByText(label)
    .closest("li[data-passed]");
  return item?.getAttribute("data-passed") ?? null;
}

describe("字段规则浮层", () => {
  it("聚焦账户名 → 浮层展开两条规则，空值双双未过；失焦收起", () => {
    renderAuthScreen("register");

    fireEvent.focus(screen.getByLabelText("账户名"));
    expect(screen.getByText("长度 1—16 个字符")).toBeTruthy();
    expect(screen.getByText("仅含中文、字母、数字或下划线")).toBeTruthy();
    expect(rulePassed("长度 1—16 个字符")).toBe("false");
    expect(rulePassed("仅含中文、字母、数字或下划线")).toBe("false");

    fireEvent.blur(screen.getByLabelText("账户名"));
    expect(screen.queryByText("长度 1—16 个字符")).toBeNull();
  });

  it("输入实时侦测：zhang san! → 长度过、字符集未过；改合法值全过", () => {
    renderAuthScreen("register");
    const account = screen.getByLabelText("账户名");

    fireEvent.focus(account);
    fireEvent.change(account, { target: { value: "zhang san!" } });
    expect(rulePassed("长度 1—16 个字符")).toBe("true");
    expect(rulePassed("仅含中文、字母、数字或下划线")).toBe("false");

    fireEvent.change(account, { target: { value: "zhang_san" } });
    expect(rulePassed("长度 1—16 个字符")).toBe("true");
    expect(rulePassed("仅含中文、字母、数字或下划线")).toBe("true");
  });

  it("登录侧不使用规则浮层：聚焦账户名与密码均不展开", () => {
    renderAuthScreen();
    const account = screen.getByLabelText("账户名");
    const password = screen.getByLabelText("密码");

    fireEvent.focus(account);
    fireEvent.change(account, { target: { value: "zhang san!" } });
    expect(screen.queryByText("长度 1—16 个字符")).toBeNull();

    fireEvent.blur(account);
    fireEvent.focus(password);
    fireEvent.change(password, { target: { value: "abcdefgh" } });
    expect(screen.queryByText("长度 8—20 位")).toBeNull();
    expect(screen.queryByText("需同时含字母与数字")).toBeNull();
  });

  it("注册侧保留规则浮层：账户名聚焦展开并实时更新（zhang san! → 字符集未过）", () => {
    renderAuthScreen("register");
    const account = screen.getByLabelText("账户名");

    fireEvent.focus(account);
    fireEvent.change(account, { target: { value: "zhang san!" } });
    expect(rulePassed("长度 1—16 个字符")).toBe("true");
    expect(rulePassed("仅含中文、字母、数字或下划线")).toBe("false");

    fireEvent.change(account, { target: { value: "zhang_san" } });
    expect(rulePassed("仅含中文、字母、数字或下划线")).toBe("true");
  });

  it("注册确认密码只展示「与第一次输入一致」规则且实时更新", () => {
    renderAuthScreen("register");

    fireEvent.change(screen.getByLabelText("设置密码"), {
      target: { value: "study2026" },
    });
    const confirm = screen.getByLabelText("确认密码");
    fireEvent.focus(confirm);
    // 确认密码不重复展示强度规则，只展示匹配规则
    expect(screen.queryByText("长度 8—20 位")).toBeNull();
    expect(screen.getByText("与第一次输入一致")).toBeTruthy();
    expect(rulePassed("与第一次输入一致")).toBe("false");

    fireEvent.change(confirm, { target: { value: "study2026" } });
    expect(rulePassed("与第一次输入一致")).toBe("true");
  });

  it("失焦后收起且不影响既有提交校验链（提交失败仍只有红框）", () => {
    const { container } = renderAuthScreen();

    fireEvent.change(screen.getByLabelText("账户名"), {
      target: { value: "zhang san!" },
    });
    fireEvent.blur(screen.getByLabelText("账户名"));
    expect(screen.queryByText("仅含中文、字母、数字或下划线")).toBeNull();

    fireEvent.submit(container.querySelector("form")!);
    expect(
      (screen.getByLabelText("账户名") as HTMLInputElement).getAttribute(
        "aria-invalid",
      ),
    ).toBe("true");
  });
});

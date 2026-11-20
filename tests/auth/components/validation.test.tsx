/**
 * Task 8：登录/注册表单渲染层校验链测试（CR-20261116-1：凭据手机号→账户名+密码）。
 *
 * 覆盖：R2 / R3（validateAccount·validatePassword 映射）、
 * D-13（登录表单无协议勾选行，Review Focus #5）、R8（注册校验）、
 * R17（密码显隐）。文案断言以 useTranslations('auth') 渲染的真实
 * auth.json（13 键新版）为准。
 *
 * 「不触发提交」以提交边界（authClient.signIn.username）未被调用断言；
 * 合法值改填用例以提交边界被调用一次作正向对照，防桩键漂移后的空转绿
 * （spec-review 终审修复批，2026-11-16：原桩键残留 phoneNumber，致
 * not.toHaveBeenCalled 恒真、改填用例走异常分支仍绿）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";
import { registerAction } from "../../../src/modules/auth/actions";

const routerReplace = vi.hoisted(() => vi.fn());
// authClient.signIn.username 经 hoisted 桩注入拦截，默认 resolve
// better-auth 客户端真实形态 { data, error }（@better-fetch 默认不 throw，
// 错误在 error 字段）；不走 vi.mocked(authClient.signIn.username)——
// 与真实 auth-client 类型面解耦。
const signInMock = vi.hoisted(() =>
  vi.fn(async () => ({ data: null, error: null })),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));
vi.mock("../../../src/modules/auth/actions", () => ({
  registerAction: vi.fn(),
}));
vi.mock("../../../src/lib/better-auth.client", () => ({
  authClient: {
    signIn: { username: signInMock },
    signOut: vi.fn(),
  },
}));

const registerMock = vi.mocked(registerAction);

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAuthScreen(props: { initialView?: "login" | "register" } = {}) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ auth: authMessages }}>
      <AuthScreen initialView={props.initialView ?? "login"} />
    </NextIntlClientProvider>,
  );
}

function submitActiveForm(container: HTMLElement): void {
  const form = container.querySelector("form");
  if (form === null) {
    throw new Error("当前视图下没有 form");
  }
  fireEvent.submit(form);
}

/** 字段错误态断言：aria-invalid 红框呈现，且不渲染任何字段级错误文案。 */
function expectInvalid(label: string): void {
  expect(
    (screen.getByLabelText(label) as HTMLInputElement).getAttribute(
      "aria-invalid",
    ),
  ).toBe("true");
}

describe("登录校验链（R1/R2/R3）", () => {
  it("账号留空+密码 a1234567 提交 → 账户名红框无文案，无顶部汇总，不触发提交", () => {
    const { container } = renderAuthScreen();

    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "a1234567" },
    });
    submitActiveForm(container);

    expectInvalid("账户名");
    expect(screen.queryByText("请输入账户名")).toBeNull();
    expect(screen.queryByText(/项需要修改/)).toBeNull();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("账号密码双空提交 → 两字段红框无文案，无顶部汇总", () => {
    const { container } = renderAuthScreen();

    submitActiveForm(container);

    expectInvalid("账户名");
    expectInvalid("密码");
    expect(screen.queryByText("请输入账户名")).toBeNull();
    expect(screen.queryByText("请输入密码")).toBeNull();
    expect(screen.queryByText(/项需要修改/)).toBeNull();
  });

  it("账号 zhang san! → 账户名红框，输入无过滤原样保留；17 位同态且完整保留；改填 zhang_san 后红框解除", () => {
    const { container } = renderAuthScreen();
    const account = screen.getByLabelText("账户名") as HTMLInputElement;

    fireEvent.change(account, { target: { value: "zhang san!" } });
    // D-12：无字符过滤逻辑，非法值原样进输入框
    expect(account.value).toBe("zhang san!");
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "a1234567" },
    });
    submitActiveForm(container);
    expect(account.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.queryByText("格式不对：1—16 位中文、字母、数字或下划线"),
    ).toBeNull();

    fireEvent.change(account, { target: { value: "abcdefghijklmnopq" } });
    // D-12：无 maxLength，17 位完整保留
    expect(account.value).toBe("abcdefghijklmnopq");
    submitActiveForm(container);
    expect(account.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(account, { target: { value: "zhang_san" } });
    submitActiveForm(container);
    expect(account.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText(/项需要修改/)).toBeNull();
    // 正向对照：合法值提交确实到达提交边界（防 mock 键漂移后的空转绿）。
    expect(signInMock).toHaveBeenCalledTimes(1);
  });

  it("账号 12345678/密码 21 位 → 密码红框无文案", () => {
    const { container } = renderAuthScreen();
    const password21 = "a12345678901234567890";

    fireEvent.change(screen.getByLabelText("账户名"), {
      target: { value: "12345678" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: password21 },
    });
    submitActiveForm(container);

    expectInvalid("密码");
    expect(screen.queryByText("密码为 8—20 位，需含字母与数字")).toBeNull();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("登录表单无协议行（D-13）：协议勾选框与协议文案均不存在于文档", () => {
    renderAuthScreen();

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/用户协议/)).toBeNull();
  });
});

describe("注册校验链（R8）", () => {
  it("账号 zhang san! → E-02 账户名红框，不触发注册", () => {
    renderAuthScreen({ initialView: "register" });

    fireEvent.change(screen.getByLabelText("账户名"), {
      target: { value: "zhang san!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "注册并进入" }));

    expectInvalid("账户名");
    expect(
      screen.queryByText("格式不对：1—16 位中文、字母、数字或下划线"),
    ).toBeNull();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("确认密码为空或不一致 → 确认密码红框无文案", () => {
    const { container } = renderAuthScreen({ initialView: "register" });

    fireEvent.change(screen.getByLabelText("账户名"), {
      target: { value: "zhang_san" },
    });
    fireEvent.change(screen.getByLabelText("设置密码"), {
      target: { value: "study2026" },
    });
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2026" },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/));

    // 确认密码为空
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "" },
    });
    submitActiveForm(container);
    expectInvalid("确认密码");
    expect(screen.queryByText("两次输入的密码不一致")).toBeNull();

    // 确认密码不一致
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2027" },
    });
    submitActiveForm(container);
    expectInvalid("确认密码");
  });

  it("合法账户名密码但未勾选协议 → 勾选框 aria-invalid 错误态，无文案", () => {
    const { container } = renderAuthScreen({ initialView: "register" });
    const checkbox = screen.getByLabelText(
      /我已阅读并同意/,
    ) as HTMLInputElement;

    fireEvent.change(screen.getByLabelText("账户名"), {
      target: { value: "zhang_san" },
    });
    fireEvent.change(screen.getByLabelText("设置密码"), {
      target: { value: "study2026" },
    });
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2026" },
    });
    submitActiveForm(container);

    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.queryByText("请阅读并勾选《用户协议》与《隐私政策》"),
    ).toBeNull();
  });
});

describe("R17 密码显隐", () => {
  it("登录密码显隐按钮点击后 input type password→text", () => {
    renderAuthScreen();
    const input = screen.getByLabelText("密码");

    expect((input as HTMLInputElement).type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "显示密码" }));
    expect((input as HTMLInputElement).type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "隐藏密码" }));
    expect((input as HTMLInputElement).type).toBe("password");
  });

  it("注册两处密码输入框同构复用显隐", () => {
    renderAuthScreen({ initialView: "register" });
    const setPassword = screen.getByLabelText("设置密码");
    const confirmPassword = screen.getByLabelText("确认密码");
    const toggles = screen.getAllByRole("button", { name: "显示密码" });

    expect(toggles.length).toBe(2);
    fireEvent.click(toggles[0]);
    expect((setPassword as HTMLInputElement).type).toBe("text");
    expect((confirmPassword as HTMLInputElement).type).toBe("password");
    fireEvent.click(toggles[1]);
    expect((confirmPassword as HTMLInputElement).type).toBe("text");
  });
});

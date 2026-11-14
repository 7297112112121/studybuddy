/**
 * Task 9 Step 1：AuthScreen 登录/注册校验链渲染测试。
 *
 * 覆盖：R1（顶部汇总）/ R2 / R3（validateAccount·validatePassword 映射）、
 * R4（协议勾选错误态）、R8（注册校验）、R17（密码显隐）、R18（OAuth 占位）、
 * R19（忘记密码占位提示）。「不触发提交」以提交边界（signIn/registerAction）
 * 未被调用断言。
 *
 * Task 10 适配：AuthScreen 移除 onSubmit spy prop、校验通过即真实提交，
 * 测试侧 mock next/navigation、../actions 与 @/lib/auth-client；
 * 「校验通过触发提交」改为断言对应提交边界被调用一次。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";
import { authClient } from "../../../src/lib/auth-client";
import { registerAction } from "../../../src/modules/auth/actions";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));
vi.mock("../../../src/modules/auth/actions", () => ({
  registerAction: vi.fn(),
}));
vi.mock("../../../src/lib/auth-client", () => ({
  authClient: {
    signIn: { phoneNumber: vi.fn() },
    signOut: vi.fn(),
  },
}));

const registerMock = vi.mocked(registerAction);
const signInMock = vi.mocked(authClient.signIn.phoneNumber);

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAuthScreen(
  props: { initialView?: "login" | "register" } = {},
) {
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

describe("登录校验链（R1/R2/R3/R4）", () => {
  it("账号留空+密码 a1234567 提交 → 账号必填文案 + 顶部「有 1 项需要修改」，不触发提交", () => {
    const { container } = renderAuthScreen();

    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "a1234567" },
    });
    submitActiveForm(container);

    expect(screen.getByText("请输入手机号或邮箱")).toBeDefined();
    expect(screen.getByText("有 1 项需要修改")).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("账号密码双空提交 → 顶部「有 2 项需要修改」", () => {
    const { container } = renderAuthScreen();

    submitActiveForm(container);

    expect(screen.getByText("请输入手机号或邮箱")).toBeDefined();
    expect(screen.getByText("请输入密码")).toBeDefined();
    expect(screen.getByText("有 2 项需要修改")).toBeDefined();
  });

  it("账号 1380013800/密码 abc@mail → 账号格式文案；改填合法并勾选协议后提示消失且触发提交", async () => {
    signInMock.mockResolvedValue({ data: null, error: null });
    const { container } = renderAuthScreen();
    const account = screen.getByLabelText(
      "手机号 / 邮箱",
    ) as HTMLInputElement;
    const password = screen.getByLabelText("密码") as HTMLInputElement;

    fireEvent.change(account, { target: { value: "1380013800" } });
    fireEvent.change(password, { target: { value: "abc@mail" } });
    submitActiveForm(container);

    expect(
      screen.getByText("格式不对：手机号 11 位，或 name@mail.com"),
    ).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();

    fireEvent.change(account, { target: { value: "13800138000" } });
    fireEvent.change(password, { target: { value: "study2026" } });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/));
    submitActiveForm(container);

    expect(
      screen.queryByText("格式不对：手机号 11 位，或 name@mail.com"),
    ).toBeNull();
    expect(screen.queryByText(/项需要修改/)).toBeNull();
    await vi.waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
  });

  it("账号 12345678/密码 21 位 → 密码规则文案", () => {
    const { container } = renderAuthScreen();
    const password21 = "a12345678901234567890";

    fireEvent.change(screen.getByLabelText("手机号 / 邮箱"), {
      target: { value: "12345678" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: password21 },
    });
    submitActiveForm(container);

    expect(screen.getByText("密码为 8—20 位，需含字母与数字")).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("合法账号密码未勾选协议提交 → 勾选框 aria-invalid 错误态，不触发提交", () => {
    const { container } = renderAuthScreen();
    const checkbox = screen.getByLabelText(
      /我已阅读并同意/,
    ) as HTMLInputElement;

    fireEvent.change(screen.getByLabelText("手机号 / 邮箱"), {
      target: { value: "13800138000" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "study2026" },
    });
    submitActiveForm(container);

    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("请阅读并勾选《用户协议》与《隐私政策》")).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
  });
});

describe("注册校验链（R8）", () => {
  it("手机号 1380013800 → 「请输入 11 位有效手机号」；改填合法后提示消失且触发提交", async () => {
    registerMock.mockResolvedValue({ ok: true });
    signInMock.mockResolvedValue({ data: null, error: null });
    renderAuthScreen({ initialView: "register" });

    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "1380013800" },
    });
    fireEvent.change(screen.getByLabelText("设置密码"), {
      target: { value: "study2026" },
    });
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2026" },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/));
    fireEvent.click(screen.getByRole("button", { name: "注册并进入" }));

    expect(screen.getByText("请输入 11 位有效手机号")).toBeDefined();
    expect(registerMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "13800138000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "注册并进入" }));

    expect(screen.queryByText("请输入 11 位有效手机号")).toBeNull();
    await vi.waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
  });

  it("确认密码为空或不一致 → 「两次输入的密码不一致」", () => {
    const { container } = renderAuthScreen({ initialView: "register" });

    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "13800138000" },
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
    expect(screen.getByText("两次输入的密码不一致")).toBeDefined();

    // 确认密码不一致
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2027" },
    });
    submitActiveForm(container);
    expect(screen.getByText("两次输入的密码不一致")).toBeDefined();
  });

  it("合法手机号密码但未勾选协议 → 勾选框 aria-invalid 错误态", () => {
    const { container } = renderAuthScreen({ initialView: "register" });
    const checkbox = screen.getByLabelText(
      /我已阅读并同意/,
    ) as HTMLInputElement;

    fireEvent.change(screen.getByLabelText("手机号"), {
      target: { value: "13800138000" },
    });
    fireEvent.change(screen.getByLabelText("设置密码"), {
      target: { value: "study2026" },
    });
    fireEvent.change(screen.getByLabelText("确认密码"), {
      target: { value: "study2026" },
    });
    submitActiveForm(container);

    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("请阅读并勾选《用户协议》与《隐私政策》")).toBeDefined();
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

describe("R18 第三方登录占位", () => {
  it("两个占位按钮 disabled 且出现「本期不做，仅占位」文案", () => {
    renderAuthScreen();

    const wechat = screen.getByRole("button", {
      name: "微信登录",
    }) as HTMLButtonElement;
    const onetap = screen.getByRole("button", {
      name: "手机号一键登录",
    }) as HTMLButtonElement;

    expect(wechat.disabled).toBe(true);
    expect(onetap.disabled).toBe(true);
    expect(screen.getByText("本期不做，仅占位")).toBeDefined();
  });
});

describe("R19 忘记密码占位", () => {
  it("点击「忘记密码?」→ 占位提示出现，preventDefault 无导航", () => {
    renderAuthScreen();

    expect(window.location.hash).toBe("");
    fireEvent.click(screen.getByText("忘记密码?"));

    expect(screen.getByText("找回密码功能暂未开通")).toBeDefined();
    expect(window.location.hash).toBe("");
  });
});

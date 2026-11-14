/**
 * Task 10 Step 1：AuthScreen 登录/注册提交流程测试。
 *
 * 网络边界全部桩化（vi.mock 按被测组件导入说明符的 resolved id 命中）：
 * - `../actions`（组件相对路径）→ 测试侧以 ../../../src/modules/auth/actions mock；
 * - `@/lib/auth-client` → signIn.phoneNumber 返回 better-auth 客户端真实形态
 *   `{ data, error }`（@better-fetch 默认不 throw，错误在 error 字段）；
 * - `next/navigation` 的 useRouter.replace。
 *
 * 覆盖：R9 注册成功链 / R5 提交加载态禁用 / R10 已注册手机号 + 去登录切换 /
 * R7 客户端统一文案（401/429）/ B2 邮箱短路（不发起请求）/ R6 登录成功落点。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import AuthScreen from "../../../src/modules/auth/components/AuthScreen";
import authMessages from "../../../src/locales/zh-CN/auth.json";
import { authClient } from "../../../src/lib/auth-client";
import { registerAction } from "../../../src/modules/auth/actions";
import type { RegisterActionResult } from "../../../src/modules/auth/actions";

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

function renderAuthScreen(props: {
  initialView?: "login" | "register";
} = {}): ReturnType<typeof render> {
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

/** 登录视图填入合法手机号账号 + 密码并勾选协议。 */
function fillLogin(account: string, password: string): void {
  fireEvent.change(screen.getByLabelText("手机号 / 邮箱"), {
    target: { value: account },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByLabelText(/我已阅读并同意/));
}

/** 注册视图填入合法手机号 + 两次一致密码并勾选协议。 */
function fillRegister(phone: string, password: string): void {
  fireEvent.change(screen.getByLabelText("手机号"), {
    target: { value: phone },
  });
  fireEvent.change(screen.getByLabelText("设置密码"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("确认密码"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByLabelText(/我已阅读并同意/));
}

describe("R9 注册成功链", () => {
  it("registerAction ok → authClient.signIn.phoneNumber 以 {phoneNumber, password} 自动登录 → router.replace('/workbench')", async () => {
    registerMock.mockResolvedValue({ ok: true });
    signInMock.mockResolvedValue({ data: null, error: null });
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("13800138000", "study2026");
    submitActiveForm(container);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    expect(registerMock).toHaveBeenCalledWith({
      phone: "13800138000",
      password: "study2026",
      confirmPassword: "study2026",
      agreementAccepted: true,
    });
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });
    expect(signInMock).toHaveBeenCalledWith({
      phoneNumber: "13800138000",
      password: "study2026",
    });
    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
  });
});

describe("R5 提交加载态", () => {
  it("registerAction 挂起 → 按钮「注册中…」且 disabled", async () => {
    registerMock.mockImplementation(
      () => new Promise<RegisterActionResult>(() => {}),
    );
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("13800138000", "study2026");
    submitActiveForm(container);

    const button = (await screen.findByRole("button", {
      name: "注册中…",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("signIn.phoneNumber 挂起 → 按钮「登录中…」且 disabled", async () => {
    signInMock.mockImplementation(
      () =>
        new Promise<{ data: null; error: null }>(() => {}),
    );
    const { container } = renderAuthScreen();

    fillLogin("13800138000", "study2026");
    submitActiveForm(container);

    const button = (await screen.findByRole("button", {
      name: "登录中…",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("R10 已注册手机号", () => {
  it("PHONE_ALREADY_REGISTERED → 顶部「该手机号已注册，去登录」；点击切换登录视图且账号框带入该手机号", async () => {
    registerMock.mockResolvedValue({
      ok: false,
      error: "PHONE_ALREADY_REGISTERED",
    });
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("13800138000", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("该手机号已注册，去登录")).toBeDefined();
    // R7 纪律：注册失败不触发任何登录请求
    expect(signInMock).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "该手机号已注册，去登录" }),
    );

    const account = screen.getByLabelText(
      "手机号 / 邮箱",
    ) as HTMLInputElement;
    expect(account.value).toBe("13800138000");
    expect(
      screen.queryByText("该手机号已注册，去登录"),
    ).toBeNull();
  });
});

describe("R7 客户端统一文案", () => {
  it("signIn.phoneNumber 返回 status 401 → 「账号或密码不对」", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: "Unauthorized", message: "" },
    });
    const { container } = renderAuthScreen();

    fillLogin("13800138000", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("账号或密码不对")).toBeDefined();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("signIn.phoneNumber 返回 status 429 → 「操作过于频繁，请稍后再试」", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 429, statusText: "Too Many Requests", message: "" },
    });
    const { container } = renderAuthScreen();

    fillLogin("13800138000", "study2026");
    submitActiveForm(container);

    expect(
      await screen.findByText("操作过于频繁，请稍后再试"),
    ).toBeDefined();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("B2 邮箱短路（R7 客户端半边）", () => {
  it("账号为邮箱形态 → 不发起任何请求，「账号或密码不对」直接呈现", async () => {
    const { container } = renderAuthScreen();

    fillLogin("name@mail.com", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("账号或密码不对")).toBeDefined();
    expect(signInMock).not.toHaveBeenCalled();
    expect(registerMock).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("R6 登录成功落点", () => {
  it("登录成功 → router.replace('/workbench')；链路仅 signIn 一次、无任何档案查询", async () => {
    signInMock.mockResolvedValue({ data: null, error: null });
    const { container } = renderAuthScreen();

    fillLogin("13800138000", "study2026");
    submitActiveForm(container);

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledTimes(1);
    });
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith({
      phoneNumber: "13800138000",
      password: "study2026",
    });
    expect(registerMock).not.toHaveBeenCalled();
  });
});

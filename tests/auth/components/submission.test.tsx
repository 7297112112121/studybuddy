/**
 * Task 9：AuthScreen 登录/注册提交流程测试（CR-20261116-1 换装 username 端点）。
 *
 * 网络边界全部桩化（vi.mock 按被测组件导入说明符的 resolved id 命中）：
 * - `@/auth`（组件跨树别名导入）→ 测试侧以同文件的
 *   相对路径 mock（resolved id 相同，命中同一模块）；
 * - `@/stores/auth-client` → signIn.username 返回 better-auth 客户端真实形态
 *   `{ data, error }`（@better-fetch 默认不 throw，错误在 error 字段）；
 *   桩沿用 T8 validation.test 的 vi.hoisted 注入形态；
 * - `next/navigation` 的 useRouter.replace。
 *
 * 覆盖：R9 注册成功链 / R5 提交加载态禁用 / R10 已注册账户名 + 去登录切换 /
 * R7 客户端统一文案（401/429）/ B2 新语义（邮箱形态走 E-02 字段错误，D-13
 * 登录无协议校验）/ INVALID_INPUT fieldErrors 归位（E-02）/ R6 登录成功落点。
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
import AuthCard from "@/features/auth/components/AuthCard";
import authMessages from "@/locales/zh-CN/auth.json";
import type { RegisterApiResult } from "@/api/auth";

const routerReplace = vi.hoisted(() => vi.fn());
// signIn.username 经 hoisted 桩注入拦截（沿用 T8 validation.test 形态），
// 不走 vi.mocked(authClient.signIn.username)——与真实 auth-client 类型面解耦。
const signInMock = vi.hoisted(() => vi.fn());

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));
vi.mock("@/stores/auth-client", () => ({
  authClient: {
    signIn: { username: signInMock },
    signOut: vi.fn(),
  },
}));

/** 注册端点桩:fetch("/api/auth/register") 返回接口契约结果(ApiResult)形态 Response。 */
function mockRegister(result: RegisterApiResult, status = 200): void {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(result), { status }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

function renderAuthScreen(
  props: {
    initialView?: "login" | "register";
  } = {},
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ auth: authMessages }}>
      <AuthCard initialView={props.initialView ?? "login"} />
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

/** 登录视图填入合法账户名 + 密码（D-13：登录侧无协议勾选步骤）。 */
function fillLogin(account: string, password: string): void {
  fireEvent.change(screen.getByLabelText("账户名"), {
    target: { value: account },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: password },
  });
}

/** 注册视图填入合法账户名 + 两次一致密码并勾选协议。 */
function fillRegister(account: string, password: string): void {
  fireEvent.change(screen.getByLabelText("账户名"), {
    target: { value: account },
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
  it("注册端点 ok → authClient.signIn.username 以 {username, password} 自动登录 → router.replace('/workbench')", async () => {
    mockRegister({ ok: true });
    signInMock.mockResolvedValue({ data: null, error: null });
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("zhang_san", "study2026");
    submitActiveForm(container);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "zhang_san",
          password: "study2026",
          confirmPassword: "study2026",
          agreementAccepted: true,
        }),
      }),
    );
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });
    expect(signInMock).toHaveBeenCalledWith({
      username: "zhang_san",
      password: "study2026",
    });
    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
  });
});

describe("R5 提交加载态", () => {
  it("注册端点挂起 → 按钮「注册中…」且 disabled", async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("zhang_san", "study2026");
    submitActiveForm(container);

    const button = (await screen.findByRole("button", {
      name: "注册中…",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("signIn.username 挂起 → 按钮「登录中…」且 disabled", async () => {
    signInMock.mockImplementation(
      () => new Promise<{ data: null; error: null }>(() => {}),
    );
    const { container } = renderAuthScreen();

    fillLogin("zhang_san", "study2026");
    submitActiveForm(container);

    const button = (await screen.findByRole("button", {
      name: "登录中…",
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("R10 已注册账户名", () => {
  it("USERNAME_ALREADY_REGISTERED → 顶部「该账户已注册，去登录」；点击切换登录视图且账户框带入该账户名", async () => {
    mockRegister({ ok: false, error: "USERNAME_ALREADY_REGISTERED" }, 409);
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("zhang_san", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("该账户已注册，去登录")).toBeDefined();
    // R7 纪律：注册失败不触发任何登录请求
    expect(signInMock).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "该账户已注册，去登录" }),
    );

    const account = screen.getByLabelText("账户名") as HTMLInputElement;
    expect(account.value).toBe("zhang_san");
    expect(screen.queryByText("该账户已注册，去登录")).toBeNull();
  });
});

describe("R7 客户端统一文案（登录失败内联呈现，AXY-8 UI 优化）", () => {
  it("signIn.username 返回 status 401 → 密码框报红 + 输入框底部「用户名或密码不匹配」；账户框不报红、无顶部 Alert", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: "Unauthorized", message: "" },
    });
    const { container } = renderAuthScreen();

    fillLogin("zhang_san", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("用户名或密码不匹配")).toBeDefined();
    expect(screen.getByLabelText("密码").getAttribute("aria-invalid")).toBe(
      "true",
    );
    // R7 纪律：不泄露探测面——账户框不因凭据失败报红
    expect(
      screen.getByLabelText("账户名").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(container.querySelector('[data-slot="alert"]')).toBeNull();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("signIn.username 返回 status 429 → 底部「操作过于频繁，请稍后再试」，密码框不报红", async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: { status: 429, statusText: "Too Many Requests", message: "" },
    });
    const { container } = renderAuthScreen();

    fillLogin("zhang_san", "study2026");
    submitActiveForm(container);

    expect(await screen.findByText("操作过于频繁，请稍后再试")).toBeDefined();
    expect(
      screen.getByLabelText("密码").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(container.querySelector('[data-slot="alert"]')).toBeNull();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("B2 邮箱形态走字段错误（新语义）", () => {
  it("账号 name@mail.com + 合法密码提交 → signIn.username 未被调，账户字段红框无文案", () => {
    const { container } = renderAuthScreen();

    fillLogin("name@mail.com", "study2026");
    submitActiveForm(container);

    expect(screen.getByLabelText("账户名").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(
      screen.queryByText("格式不对：1—16 位中文、字母、数字或下划线"),
    ).toBeNull();
    expect(signInMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("INVALID_INPUT fieldErrors 归位（E-02）", () => {
  it("INVALID_INPUT + fieldErrors:{username:'auth.account.invalid'} → 注册视图账户字段红框无文案，不自动登录", async () => {
    mockRegister(
      {
        ok: false,
        error: "INVALID_INPUT",
        fieldErrors: { username: "auth.account.invalid" },
      },
      400,
    );
    const { container } = renderAuthScreen({ initialView: "register" });

    fillRegister("zhang_san", "study2026");
    submitActiveForm(container);

    await waitFor(() => {
      expect(screen.getByLabelText("账户名").getAttribute("aria-invalid")).toBe(
        "true",
      );
    });
    expect(
      screen.queryByText("格式不对：1—16 位中文、字母、数字或下划线"),
    ).toBeNull();
    expect(signInMock).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe("R6 登录成功落点", () => {
  it("登录成功 → router.replace('/workbench')；payload 含 {username}，链路仅 signIn 一次、无任何档案查询", async () => {
    signInMock.mockResolvedValue({ data: null, error: null });
    const { container } = renderAuthScreen();

    fillLogin("zhang_san", "study2026");
    submitActiveForm(container);

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledTimes(1);
    });
    expect(routerReplace).toHaveBeenCalledWith("/workbench");
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith({
      username: "zhang_san",
      password: "study2026",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

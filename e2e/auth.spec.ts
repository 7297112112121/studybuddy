import { expect, test, type Page } from "@playwright/test";

import {
  E2E_PASSWORD,
  fillLoginForm,
  registerViaUI,
  signOut,
  throttleSignIn,
  uniquePhone,
} from "./helpers/auth";

/**
 * 登录注册全流程 E2E（Task 12，R1–R6、R8–R12、R16–R19 的浏览器级验证）。
 *
 * 限流约束（Task 12 实测）：生产构建下 Better Auth 限流默认开启，登录类
 * 请求的实际规则是 /sign-in/* 特殊规则「3 次/10 秒」。全 spec 的真实
 * sign-in 次数收敛在 10 次以内，并经 throttleSignIn（helpers）保持
 * ≥3.5s 间距；校验链/视图切换用例全部走纯前端校验（邮箱形态账号走 B2
 * 不发请求），注册类用例每个账号只产生「注册自动登录 + 显式登录」的
 * 必要调用。config workers: 1 保证节流时间戳全局生效。
 *
 * 文案断言逐字对齐 src/locales/zh-CN/auth.json 与组件渲染文案
 * （em-dash「8—20」、省略号「登录中…」）。
 */

/** 顶部汇总（R1）：计数文案在独立 span 内，外层 alert 含装饰性「!」。 */
function formSummary(page: Page) {
  return page.getByText(/^有 \d+ 项需要修改$/);
}

test.describe("校验链（登录视图）", () => {
  test("R1: 空表单提交呈现字段级错误、汇总计数与协议错误态，不提交", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(formSummary(page)).toHaveText(/^有 2 项需要修改$/);
    await expect(page.locator("#login-account-error")).toHaveText(
      "请输入手机号或邮箱",
    );
    await expect(page.locator("#login-password-error")).toHaveText("请输入密码");
    await expect(page.locator("#login-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );
    await expect(page.locator("#login-account")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#login-agreement")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("R2: 账号格式非法提示，改填合法格式后该提示消失", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, "1380013800"); // 10 位：合法边界外
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toHaveText(
      "格式不对：手机号 11 位，或 name@mail.com",
    );
    await expect(formSummary(page)).toHaveText(/^有 1 项需要修改$/);

    // 改填合法格式后重新提交：账号提示消失。密码同时改坏（纯数字），
    // 使提交止于前端校验、不触发对未注册号码的真实登录请求。
    await fillLoginForm(page, uniquePhone(), "12345678");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toBeHidden();
    await expect(page.locator("#login-password-error")).toHaveText(
      "密码为 8—20 位，需含字母与数字",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("R3: 密码强度规则（登录框）：纯数字被拦截", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, uniquePhone(), "12345678");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-password-error")).toHaveText(
      "密码为 8—20 位，需含字母与数字",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("R4: 未勾选协议不提交、勾选框错误态；勾选后该错误解除", async ({
    page,
  }) => {
    await page.goto("/login");
    await fillLoginForm(page, uniquePhone());
    await page.locator("#login-agreement").uncheck();
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.locator("#login-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );
    await expect(page.locator("#login-agreement")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(formSummary(page)).toBeHidden(); // 协议错误不进汇总计数
    await expect(page).toHaveURL(/\/login$/);

    // 勾选后再提交：协议错误解除。账号换成邮箱形态（B2：不发起请求，
    // 直接呈现统一失败文案），用例止于客户端行为、不消耗限流额度。
    await page.locator("#login-agreement").check();
    await page.getByLabel("手机号 / 邮箱", { exact: true }).fill("e2e@example.com");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-agreement-error")).toBeHidden();
    await expect(page.getByText("账号或密码不对")).toBeVisible();
  });

  test("R18: 第三方登录区为禁用占位（微信登录、手机号一键登录）", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "微信登录" })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "手机号一键登录" }),
    ).toBeDisabled();
    await expect(page.getByText("本期不做，仅占位")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "其他登录方式" }),
    ).toBeVisible();
  });

  test("R19: 忘记密码为占位入口，点击提示暂未开通", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "忘记密码?" }).click();
    await expect(page.getByText("找回密码功能暂未开通")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/); // 不进入找回密码流程
  });

  test("R17: 密码输入框提供显示/隐藏明文切换", async ({ page }) => {
    await page.goto("/login");
    const loginPassword = page.locator("#login-password");
    await loginPassword.fill("secret123");

    await page.getByRole("button", { name: "显示密码" }).click();
    await expect(loginPassword).toHaveAttribute("type", "text");
    await expect(loginPassword).toHaveValue("secret123");
    await page.getByRole("button", { name: "隐藏密码" }).click();
    await expect(loginPassword).toHaveAttribute("type", "password");

    // 注册视图同构复用（三个密码框同一组件），抽设置密码框复验
    await page.goto("/register");
    const registerPassword = page.locator("#register-password");
    await registerPassword.fill("secret456");
    await page.getByRole("button", { name: "显示密码" }).first().click();
    await expect(registerPassword).toHaveAttribute("type", "text");
  });
});

test.describe("校验链（注册视图）", () => {
  test("R8: 注册字段校验链（手机号/密码/确认密码/协议）逐项呈现", async ({
    page,
  }) => {
    await page.goto("/register");

    // 空表单：手机号 + 密码两项进汇总，协议单列
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(formSummary(page)).toHaveText(/^有 2 项需要修改$/);
    await expect(page.locator("#register-phone-error")).toHaveText(
      "请输入 11 位有效手机号",
    );
    await expect(page.locator("#register-password-error")).toHaveText(
      "请输入密码",
    );
    await expect(page.locator("#register-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );

    // 10 位手机号：手机号单项
    await page.getByLabel("手机号", { exact: true }).fill("1380013800");
    await page.getByLabel("设置密码", { exact: true }).fill(E2E_PASSWORD);
    await page.getByLabel("确认密码", { exact: true }).fill(E2E_PASSWORD);
    await page.locator("#register-agreement").check();
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-phone-error")).toHaveText(
      "请输入 11 位有效手机号",
    );
    await expect(formSummary(page)).toHaveText(/^有 1 项需要修改$/);

    // 确认密码不一致（密码本身合格）：确认密码单项
    await page.getByLabel("手机号", { exact: true }).fill(uniquePhone());
    await page.getByLabel("确认密码", { exact: true }).fill("different999");
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-confirm-error")).toHaveText(
      "两次输入的密码不一致",
    );
    await expect(formSummary(page)).toHaveText(/^有 1 项需要修改$/);

    // 一致但未勾选协议：仅协议错误态，不提交
    await page.getByLabel("确认密码", { exact: true }).fill(E2E_PASSWORD);
    await page.locator("#register-agreement").uncheck();
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );
    await expect(page.locator("#register-agreement")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(formSummary(page)).toBeHidden();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("R16: 顶部 tab 与底部链接切视图：值保留、错误清空、URL 同步", async ({
    page,
  }) => {
    const phone = uniquePhone();
    await page.goto("/login");

    // 先制造错误，再切视图：错误应被清空
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toBeVisible();

    await page.getByLabel("手机号 / 邮箱", { exact: true }).fill(phone);
    await page.getByLabel("密码", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("tab", { name: "注册" }).click();

    // URL 经 replaceState 同步为 /register，已填值在注册视图保留
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator("#register-phone")).toHaveValue(phone);
    await expect(page.locator("#register-password")).toHaveValue(E2E_PASSWORD);
    await expect(page.locator("#login-account-error")).toBeHidden();
    await expect(formSummary(page)).toBeHidden();

    // 底部切换控件（ViewSwitchLink 为 button 语义，不导航）切回登录：值继续保留
    await page.getByRole("button", { name: "去登录", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#login-account")).toHaveValue(phone);
    await expect(page.locator("#login-password")).toHaveValue(E2E_PASSWORD);
  });
});

test.describe("注册流程", () => {
  test("R5/R9/R10: 注册成功进工作台；登录按钮加载态；重复注册提示切登录带手机号", async ({
    page,
  }) => {
    const phone = uniquePhone();

    // R9：注册成功 → 自动登录 → /workbench，session-phone 为该手机号
    await registerViaUI(page, phone);

    // R5：登录按钮加载态——拦截 sign-in 端点延迟 300ms，断言「登录中…」+ disabled
    await signOut(page);
    await page.route("**/api/auth/sign-in/phone-number", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await fillLoginForm(page, phone);
    // pending 态按钮文案变「登录中…」，name 用前缀匹配才能在两种形态间稳定定位
    const loginButton = page.getByRole("button", { name: /^登录/ });
    await throttleSignIn();
    await loginButton.click();
    await expect(loginButton).toHaveText("登录中…");
    await expect(loginButton).toBeDisabled();
    await expect(page).toHaveURL(/\/workbench$/); // 延迟放行后正常登录
    await expect(page.getByTestId("session-phone")).toHaveText(phone);

    // R10：重复注册 → 顶部整条可点文案 → 切登录视图且账号框带入该手机号
    await signOut(page);
    await page.goto("/register");
    await page.getByLabel("手机号", { exact: true }).fill(phone);
    await page.getByLabel("设置密码", { exact: true }).fill(E2E_PASSWORD);
    await page.getByLabel("确认密码", { exact: true }).fill(E2E_PASSWORD);
    await page.locator("#register-agreement").check();
    await page.getByRole("button", { name: "注册并进入" }).click();
    const phoneRegistered = page.getByRole("button", {
      name: "该手机号已注册，去登录",
    });
    await expect(phoneRegistered).toBeVisible();
    await phoneRegistered.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("tab", { name: "登录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#login-account")).toHaveValue(phone);
  });
});

test.describe("登录流程", () => {
  test("R6: 账号一（未建档链路）注册后退出再登录，落工作台", async ({
    page,
  }) => {
    const phone = uniquePhone();
    await registerViaUI(page, phone);
    await signOut(page);

    await fillLoginForm(page, phone);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-phone")).toHaveText(phone);
  });

  test("R6: 账号二同链路行为一致", async ({ page }) => {
    const phone = uniquePhone();
    await registerViaUI(page, phone);
    await signOut(page);

    await fillLoginForm(page, phone);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-phone")).toHaveText(phone);
  });
});

test.describe("会话与守卫", () => {
  test("R11/R12: 退出后会话即刻失效，直访与后退均回登录，重登数据完好，有历史访问 /login 自动返回", async ({
    page,
  }) => {
    const phone = uniquePhone();
    await registerViaUI(page, phone);

    // 退出 → /login
    await signOut(page);

    // 直访 /workbench → 未登录拦截，最终落在 /login（cacheComponents 下
    // 首个响应为 200 postponed shell，重定向由客户端完成，见 B6 用例）
    await page.goto("/workbench");
    await expect(page).toHaveURL(/\/login$/);

    // 浏览器后退 → 仍在登录页
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);

    // 重新登录同号 → /workbench 且手机号一致（数据完好）
    await fillLoginForm(page, phone);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-phone")).toHaveText(phone);

    // R12（有历史）：站内导航到 /login → 不渲染表单，自动返回工作台
    await page.goto("/login");
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-phone")).toHaveText(phone);
  });

  test("R12: 已登录新建页面直开 /login（无历史）→ 进入工作台", async ({
    page,
    context,
  }) => {
    const phone = uniquePhone();
    await registerViaUI(page, phone);

    // 同 context 新开页面：会话 cookie 共享，历史为空 → replace 进工作台
    const page2 = await context.newPage();
    await page2.goto("/login");
    await expect(page2).toHaveURL(/\/workbench$/);
    await expect(page2.getByTestId("session-phone")).toHaveText(phone);
  });

  test("B6: 未登录访问 /workbench 响应不含受保护内容，浏览器最终落 /login", async ({
    browser,
    request,
  }) => {
    // 响应原文级：Next 16 cacheComponents 下未登录访问返回 200 postponed
    // shell（重定向在客户端完成，非 307），响应原文不得携带任何受保护内容
    const redirected = await request.get("/workbench", { maxRedirects: 0 });
    expect(redirected.ok()).toBeTruthy();
    const body = await redirected.text();
    expect(body).not.toContain("工作台");
    expect(body).not.toContain("当前登录");
    expect(body).not.toContain("session-phone");
    expect(body).not.toContain("退出登录");

    // 浏览器级：全新未登录 context 直访 /workbench，最终落在登录页
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/workbench");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#login-account")).toBeVisible();
    await context.close();
  });
});

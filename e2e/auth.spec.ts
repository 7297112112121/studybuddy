import { expect, test } from "@playwright/test";

import {
  E2E_PASSWORD,
  fillLoginForm,
  registerViaUI,
  signOut,
  throttleSignIn,
  uniqueUsername,
} from "./helpers/auth";

/**
 * 登录注册全流程 E2E（Task 11，CR-20261116-1 凭据换装：手机号→账户名+密码，
 * R1–R6、R8–R12、R16–R17 的浏览器级验证；R7 双半边证据在集成侧 T7/T9）。
 *
 * 限流约束（Task 12 实测，沿用）：生产构建下 Better Auth 限流默认开启，
 * 登录类请求的实际规则是 /sign-in/* 特殊规则「3 次/10 秒」。全 spec 的真实
 * sign-in 次数收敛在 10 次以内（登录端点 /api/auth/sign-in/username），
 * 并经 throttleSignIn（helpers）保持 ≥3.5s 间距；校验链/视图切换用例全部
 * 走纯前端校验（不发请求），注册类用例每个账号只产生「注册自动登录 +
 * 显式登录」的必要调用。config workers: 1 保证节流时间戳全局生效。
 *
 * 文案断言逐字对齐 src/locales/zh-CN/auth.json 与组件渲染文案
 * （em-dash「8—20」与「1—16」、省略号「登录中…」）。
 *
 * Task 11 首跑实测的两处胶水修正：
 * 1. 节流打点——注册自动登录的实际请求在 registerAction 往返后才发出，
 *    打点须在请求完成后重置（见 helpers throttleSignIn 注释），否则真实
 *    间隔缩水致第 4 发登录吃 429；
 * 2. 定位器作用域——Next 16 客户端导航经 React Activity 隐藏保留离开页
 *    的 DOM（display:none，表单值随之保留），残留 /register 页树与当前
 *    视图共用 label「账户名」，getByLabel 双匹配；字段填充一律用
 *    字段 id（#login-account、#register-account 等，表单契约唯一锚点，
 *    产品代码不动）。
 */

test.describe("校验链（登录视图）", () => {
  test("R1: 空表单提交呈现账户名与密码必填错误，不提交", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.locator("#login-account-error")).toHaveText(
      "请输入账户名",
    );
    await expect(page.locator("#login-password-error")).toHaveText("请输入密码");
    await expect(page.locator("#login-account")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#login-password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("R2: 账户名格式非法原样保留输入，改填合法格式后提示消失", async ({
    page,
  }) => {
    await page.goto("/login");

    // 含空格与非法字符：E-02 逐字，输入框无过滤完整保留所输值（D-12）
    await fillLoginForm(page, "zhang san!");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toHaveText(
      "格式不对：1—16 位中文、字母、数字或下划线",
    );
    await expect(page.locator("#login-account")).toHaveValue("zhang san!");

    // 17 位超长：同样 E-02，value 完整保留 17 位（无 maxLength 直证）
    await fillLoginForm(page, "abcdefghijklmnopq");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toHaveText(
      "格式不对：1—16 位中文、字母、数字或下划线",
    );
    await expect(page.locator("#login-account")).toHaveValue(
      "abcdefghijklmnopq",
    );

    // 改填合法账户名重新提交：账户名提示消失。密码同时改坏（纯数字），
    // 使提交止于前端校验、不触发对未注册账户的真实登录请求。
    await fillLoginForm(page, "zhang_san", "12345678");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toBeHidden();
    await expect(page.locator("#login-password-error")).toHaveText(
      "密码为 8—20 位，需含字母与数字",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("R3: 密码强度规则（登录框）：纯数字被拦截", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, uniqueUsername(), "12345678");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-password-error")).toHaveText(
      "密码为 8—20 位，需含字母与数字",
    );
    await expect(page).toHaveURL(/\/login$/);
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
  test("R8: 注册字段校验链（账户名/密码/确认密码）逐项呈现", async ({
    page,
  }) => {
    await page.goto("/register");

    // 空表单：账户名 + 密码字段级错误，协议单列（R4 用例专验）
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-account-error")).toHaveText(
      "格式不对：1—16 位中文、字母、数字或下划线",
    );
    await expect(page.locator("#register-password-error")).toHaveText(
      "请输入密码",
    );
    await expect(page.locator("#register-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );

    // 17 位账户名（密码两框一致、协议已勾）：账户名单项
    // （字段填充一律用 #register-* id 定位器：Next 16 Activity 会把导航
    // 离开的页树隐藏保留在 DOM，与当前视图共用 label「账户名」致双匹配）
    await page.locator("#register-account").fill("abcdefghijklmnopq");
    await page.locator("#register-password").fill(E2E_PASSWORD);
    await page.locator("#register-confirm").fill(E2E_PASSWORD);
    await page.locator("#register-agreement").check();
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-account-error")).toHaveText(
      "格式不对：1—16 位中文、字母、数字或下划线",
    );

    // 确认密码不一致（账户名与密码合格）：确认密码单项
    await page.locator("#register-account").fill(uniqueUsername());
    await page.locator("#register-confirm").fill("different999");
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-confirm-error")).toHaveText(
      "两次输入的密码不一致",
    );
    await expect(page).toHaveURL(/\/register$/);
  });

  test("R4: 注册未勾选协议不提交、勾选框错误态；勾选后该错误解除", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.locator("#register-account").fill(uniqueUsername());
    await page.locator("#register-password").fill(E2E_PASSWORD);
    await page.locator("#register-confirm").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "注册并进入" }).click();

    await expect(page.locator("#register-agreement-error")).toHaveText(
      "请阅读并勾选《用户协议》与《隐私政策》",
    );
    await expect(page.locator("#register-agreement")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/register$/);

    // 勾选后再提交：协议错误解除。确认密码改坏使提交止于前端校验、
    // 不触发真实注册请求——改坏的字段与协议无关，恰好证明协议错误单独解除。
    await page.locator("#register-agreement").check();
    await page.locator("#register-confirm").fill("different999");
    await page.getByRole("button", { name: "注册并进入" }).click();
    await expect(page.locator("#register-agreement-error")).toBeHidden();
    await expect(page.locator("#register-confirm-error")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("R16: 顶部 tab 与底部链接切视图：值保留、错误清空、URL 同步", async ({
    page,
  }) => {
    const username = uniqueUsername();
    await page.goto("/login");

    // 先制造错误，再切视图：错误应被清空
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.locator("#login-account-error")).toBeVisible();

    await fillLoginForm(page, username);
    await page.getByRole("tab", { name: "注册" }).click();

    // URL 经 replaceState 同步为 /register，已填值在注册视图保留
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator("#register-account")).toHaveValue(username);
    await expect(page.locator("#register-password")).toHaveValue(E2E_PASSWORD);
    await expect(page.locator("#login-account-error")).toBeHidden();

    // 底部切换控件（ViewSwitchLink 为 button 语义，不导航）切回登录：值继续保留
    await page.getByRole("button", { name: "去登录", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#login-account")).toHaveValue(username);
    await expect(page.locator("#login-password")).toHaveValue(E2E_PASSWORD);
  });
});

test.describe("注册流程", () => {
  test("R5/R9/R10: 注册成功进工作台；登录按钮加载态；重复注册提示切登录带账户名", async ({
    page,
  }) => {
    const username = uniqueUsername();

    // R9：注册成功 → 自动登录 → /workbench，session-account 为该账户名
    await registerViaUI(page, username);

    // R5：登录按钮加载态——拦截 username 登录端点延迟 300ms，断言「登录中…」+ disabled
    await signOut(page);
    await page.route("**/api/auth/sign-in/username", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await fillLoginForm(page, username);
    // pending 态按钮文案变「登录中…」，name 用前缀匹配才能在两种形态间稳定定位
    const loginButton = page.getByRole("button", { name: /^登录/ });
    await throttleSignIn();
    await loginButton.click();
    await expect(loginButton).toHaveText("登录中…");
    await expect(loginButton).toBeDisabled();
    await expect(page).toHaveURL(/\/workbench$/); // 延迟放行后正常登录
    await expect(page.getByTestId("session-account")).toHaveText(username);

    // R10：重复注册 → 顶部整条可点文案 → 切登录视图且账户名框带入该账户名
    await signOut(page);
    await page.goto("/register");
    await page.locator("#register-account").fill(username);
    await page.locator("#register-password").fill(E2E_PASSWORD);
    await page.locator("#register-confirm").fill(E2E_PASSWORD);
    await page.locator("#register-agreement").check();
    await page.getByRole("button", { name: "注册并进入" }).click();
    const usernameRegistered = page.getByRole("button", {
      name: "该账户已注册，去登录",
    });
    await expect(usernameRegistered).toBeVisible();
    await usernameRegistered.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("tab", { name: "登录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#login-account")).toHaveValue(username);
  });
});

test.describe("登录流程", () => {
  test("R6: 账号一（未建档链路）注册后退出再登录，落工作台", async ({
    page,
  }) => {
    const username = uniqueUsername();
    await registerViaUI(page, username);
    await signOut(page);

    await fillLoginForm(page, username);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-account")).toHaveText(username);
  });

  test("R6: 账号二同链路行为一致", async ({ page }) => {
    const username = uniqueUsername();
    await registerViaUI(page, username);
    await signOut(page);

    await fillLoginForm(page, username);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-account")).toHaveText(username);
  });
});

test.describe("会话与守卫", () => {
  test("R11/R12: 退出后会话即刻失效，直访与后退均回登录，重登数据完好，有历史访问 /login 自动返回", async ({
    page,
  }) => {
    const username = uniqueUsername();
    await registerViaUI(page, username);

    // 退出 → /login
    await signOut(page);

    // 直访 /workbench → 未登录拦截，最终落在 /login（cacheComponents 下
    // 首个响应为 200 postponed shell，重定向由客户端完成，见 B6 用例）
    await page.goto("/workbench");
    await expect(page).toHaveURL(/\/login$/);

    // 浏览器后退 → 仍在登录页
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);

    // 重新登录同号 → /workbench 且账户名一致（数据完好）
    await fillLoginForm(page, username);
    await throttleSignIn();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-account")).toHaveText(username);

    // R12（有历史）：站内导航到 /login → 不渲染表单，自动返回工作台
    await page.goto("/login");
    await expect(page).toHaveURL(/\/workbench$/);
    await expect(page.getByTestId("session-account")).toHaveText(username);
  });

  test("R12: 已登录新建页面直开 /login（无历史）→ 进入工作台", async ({
    page,
    context,
  }) => {
    const username = uniqueUsername();
    await registerViaUI(page, username);

    // 同 context 新开页面：会话 cookie 共享，历史为空 → replace 进工作台
    const page2 = await context.newPage();
    await page2.goto("/login");
    await expect(page2).toHaveURL(/\/workbench$/);
    await expect(page2.getByTestId("session-account")).toHaveText(username);
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
    expect(body).not.toContain("session-account");
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

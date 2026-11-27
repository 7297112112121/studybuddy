import { expect, type Page } from "@playwright/test";

import { uniqueUsername } from "../../tests/support/username";

// 造号唯一实现在 tests/support/username(测试纪律:测试共享件唯一实现),
// 此处转发以保持 spec 的 "./helpers/auth" 导入不变。
export { uniqueUsername };

let lastSignInAt = 0;
const MIN_SIGN_IN_INTERVAL_MS = 3500;

export async function throttleSignIn(): Promise<void> {
  const wait = lastSignInAt + MIN_SIGN_IN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastSignInAt = Date.now();
}

/** 统一注册密码（满足 8—20 位且含字母与数字）。 */
export const E2E_PASSWORD = "e2ePass123";

export async function registerViaUI(
  page: Page,
  username: string,
  password: string = E2E_PASSWORD,
): Promise<void> {
  await page.goto("/register");
  await page.locator("#register-account").fill(username);
  await page.locator("#register-password").fill(password);
  await page.locator("#register-confirm").fill(password);
  await page.locator("#register-agreement").check();
  // 注册提交成功后会自动登录（signIn.username），受 3 次/10 秒限流约束
  await throttleSignIn();
  await page.getByRole("button", { name: "注册并进入" }).click();
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(page.getByTestId("session-account")).toHaveText(username);
  // 自动登录请求此时必已完成：以当前时刻重置节流基线
  lastSignInAt = Date.now();
}

export async function fillLoginForm(
  page: Page,
  account: string,
  password: string = E2E_PASSWORD,
): Promise<void> {
  await page.locator("#login-account").fill(account);
  await page.locator("#login-password").fill(password);
}

/** 在工作台点击退出登录并等待回到登录视图。 */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

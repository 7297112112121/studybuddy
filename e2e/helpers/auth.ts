import { expect, type Page } from "@playwright/test";

/**
 * E2E 公共助手（Task 12）。
 *
 * uniquePhone：Better Auth 限流（生产构建默认开启）+ user.phoneNumber
 * 唯一索引——每个用例必须持有互不相同、形态合法（^1[3-9]\d{9}$）的手机号。
 * 登录类请求的实际限流为 /sign-in/* 特殊规则 3 次/10 秒（见 throttleSignIn）。
 * 以「13 + 时间戳后 9 位 + 用例内递增序号」构造，同一毫秒内多次调用也不冲突。
 *
 * registerViaUI：完全走 UI 注册链路（R8 校验链 → registerAction → 自动登录
 * → /workbench），返回前等待 session-phone 渲染，确保会话就绪。
 */

let seq = 0;

/**
 * 登录类请求节流（Task 12 实测）：生产构建下 Better Auth 限流默认开启，
 * /sign-in/* 路径命中特殊规则「3 次/10 秒」（phoneNumber 插件自身的
 * 10 次/60 秒规则只匹配顶层 /phone-number/* 路径，不覆盖 sign-in）。
 * 本 helper 保证任意相邻两次登录类请求间隔 ≥3.5s——任何 10 秒窗口内
 * 至多 3 次，恰好贴合规则上限。依赖 playwright.config 的 workers: 1
 * （单 worker 串行执行）使模块级时间戳在全 spec 生效。
 */
let lastSignInAt = 0;
const MIN_SIGN_IN_INTERVAL_MS = 3500;

export async function throttleSignIn(): Promise<void> {
  const wait = lastSignInAt + MIN_SIGN_IN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastSignInAt = Date.now();
}

/** 生成形态合法且互不重复的 11 位手机号（前缀 13x）。 */
export function uniquePhone(): string {
  seq += 1;
  const tail = 3_000_000_000 + (Date.now() % 1_000_000_000) + seq;
  return `1${tail}`;
}

/** 统一注册密码（满足 8—20 位且含字母与数字）。 */
export const E2E_PASSWORD = "e2ePass123";

/**
 * 经 UI 完成注册并自动登录，最终落在 /workbench。
 * 断言 session-phone 渲染为该手机号（R9 自动登录 + 数据锚点）。
 */
export async function registerViaUI(
  page: Page,
  phone: string,
  password: string = E2E_PASSWORD,
): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("手机号", { exact: true }).fill(phone);
  await page.getByLabel("设置密码", { exact: true }).fill(password);
  await page.getByLabel("确认密码", { exact: true }).fill(password);
  await page.locator("#register-agreement").check();
  // 注册提交成功后会自动登录（ signIn.phoneNumber），受 3 次/10 秒限流约束
  await throttleSignIn();
  await page.getByRole("button", { name: "注册并进入" }).click();
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(page.getByTestId("session-phone")).toHaveText(phone);
}

/** 在登录视图填写账号/密码并勾选协议（不点击提交，由用例自行控制提交时机）。 */
export async function fillLoginForm(
  page: Page,
  account: string,
  password: string = E2E_PASSWORD,
): Promise<void> {
  await page.getByLabel("手机号 / 邮箱", { exact: true }).fill(account);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.locator("#login-agreement").check();
}

/** 在工作台点击退出登录并等待回到登录视图。 */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

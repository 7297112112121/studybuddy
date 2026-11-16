import { expect, type Page } from "@playwright/test";

/**
 * E2E 公共助手（Task 11，CR-20261116-1 凭据换装：手机号→账户名+密码）。
 *
 * uniqueUsername：Better Auth 限流（生产构建默认开启）+ user.username
 * 唯一索引——每个用例必须持有互不相同、形态合法（F-01：1—16 位中文、
 * 字母、数字或下划线）的账户名。登录类请求的实际限流为 /sign-in/*
 * 特殊规则 3 次/10 秒（见 throttleSignIn）。
 * 以「e2e_ + 时间戳(1e9 取模) base36 + 用例内递增序号」构造，
 * 全字符落在 [a-z0-9_]，长度 ≤16，同一毫秒内多次调用也不冲突。
 *
 * registerViaUI：完全走 UI 注册链路（R8 校验链 → registerAction → 自动登录
 * → /workbench），返回前等待 session-account 渲染，确保会话就绪。
 */

let seq = 0;

/**
 * 登录类请求节流（Task 12 实测，Task 11 修正打点时机）：生产构建下
 * Better Auth 限流默认开启，/sign-in/* 路径命中特殊规则「3 次/10 秒」。
 * 本 helper 保证任意相邻两次登录类请求间隔 ≥3.5s——任何 10 秒窗口内
 * 至多 3 次，恰好贴合规则上限。依赖 playwright.config 的 workers: 1
 * （单 worker 串行执行）使模块级时间戳在全 spec 生效。
 *
 * Task 11 实测修正（E2E 首跑 R11/R12 吃 429）：注册自动登录的实际请求
 * 在 registerAction 服务端往返之后才发出，若在点击前打点，真实间隔会被
 * 「打点→请求」之间的往返耗时吃掉（实测缩至 ~2.5s，四发挤进同一 10 秒
 * 窗口）。故 registerViaUI 在自动登录请求完成（session-account 断言通过）
 * 后重置节流基线，保证下一发登录请求与它的真实间隔 ≥3.5s。
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

/** 生成形态合法（1—16 位字母/数字/下划线）且互不重复的账户名。 */
export function uniqueUsername(): string {
  seq += 1;
  const tail = (Date.now() % 1_000_000_000).toString(36);
  return `e2e_${tail}${seq}`;
}

/** 统一注册密码（满足 8—20 位且含字母与数字）。 */
export const E2E_PASSWORD = "e2ePass123";

/**
 * 经 UI 完成注册并自动登录，最终落在 /workbench。
 * 断言 session-account 渲染为该账户名（R9 自动登录 + 数据锚点）。
 *
 * 定位器用字段 id（#register-*）而非 getByLabel：Next 16 客户端导航用
 * React Activity 隐藏离开的页面，DOM 原样保留（display:none，表单值随
 * 之保留），残留的 /register 页树与当前视图共用 label「账户名」（单一
 * AccountField 实现），getByLabel 会双匹配；字段 id 按表单契约唯一。
 * 返回前重置节流基线（自动登录请求已完成，见 throttleSignIn 注释）。
 */
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

/**
 * 在登录视图填写账户名/密码（不点击提交，由用例自行控制提交时机）。
 * D-13：登录表单无协议勾选行，无勾选步骤。
 * 定位器用字段 id（#login-*）：见 registerViaUI 注释——Activity 残留页树
 * 与当前视图共用 label「账户名」，getByLabel 会双匹配。
 */
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

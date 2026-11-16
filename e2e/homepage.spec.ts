import { expect, test } from "@playwright/test";

/**
 * 冒烟测试：首页加载链路（webServer 生产构建拉起 + 探活 + Chromium 可用）。
 * src/app/page.tsx 为登录态分流薄壳（AXY-8 后清理脚手架残留）：未登录访问
 * / 服务端 redirect 到 /login，呈现登录表单。E2E 无共享登录态，断言该分支。
 */
test("未登录访问首页 → 重定向 /login 并呈现登录表单", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("tab", { name: "登录" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("未登录访问首页 → 重定向 /login 并呈现登录表单", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("tab", { name: "登录" })).toBeVisible();
});

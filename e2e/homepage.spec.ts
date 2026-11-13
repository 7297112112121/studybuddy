import { expect, test } from "@playwright/test";

/**
 * 冒烟测试：首页加载链路（webServer 生产构建拉起 + 探活 + Chromium 可用）。
 * 断言对象为 src/app/page.tsx 现有渲染内容，不修改业务代码（ADR-0017）。
 */
test("首页加载并渲染欢迎标题", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "To get started, edit the",
  );
});

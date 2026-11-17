/**
 * /calendar 全流程 E2E（AXY-22 Task 8，proposal R1–R6、R8–R12；演示态 1–5）。
 *
 * 对生产构建跑（webServer 自动 build && start）；每次注册独立账号
 * （registerViaUI 含节流与自动登录），用例间无状态耦合。日期取相对值
 * （测试机=服务器时区，design 开放问题 #2 单时区假设），不硬编码
 * proposal 示例日。定位器用字段 id（#calendar-entry-*）——沿 auth 先例。
 */
import { expect, test, type Page } from "@playwright/test";

import {
  E2E_PASSWORD,
  registerViaUI,
  throttleSignIn,
  uniqueUsername,
} from "./helpers/auth";

/** Date → "YYYY-MM-DD"（本地时区字面日期）。 */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 拦截 Server Action POST（带 Next-Action 头的 POST 才算 action 调用）。 */
async function interceptActions(
  page: Page,
  handle: (route: import("@playwright/test").Route) => Promise<unknown>,
): Promise<void> {
  await page.route("**/calendar*", (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"] !== undefined) {
      return handle(route);
    }
    return route.continue();
  });
}

/** 注册并落到 /calendar（注册对偶发限流失败重试一次，换新账户名）。 */
async function registerAndOpenCalendar(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);
      break;
    } catch (error) {
      if (attempt === 1) throw error;
      await throttleSignIn();
    }
  }
  await page.getByTestId("calendar-entry").click();
  await expect(page).toHaveURL(/\/calendar$/);
}

/** 当日详情面板（断言锚点：月格摘要与详情行并存时收窄作用域）。 */
function dayPanel(page: Page) {
  return page.getByTestId("day-panel");
}

/** 经详情面板底部表单创建条目。 */
async function createEntry(
  page: Page,
  entry: { title: string; start?: string; end?: string },
): Promise<void> {
  await page.locator("#calendar-entry-title").fill(entry.title);
  if (entry.start) {
    await page.locator("#calendar-entry-start").fill(entry.start);
  }
  if (entry.end) {
    await page.locator("#calendar-entry-end").fill(entry.end);
  }
  await page.getByRole("button", { name: "添加" }).click();
}

test.describe("AXY-22 日程日历", () => {
  test("R9：未登录直达 /calendar → 重定向 /login，响应不含日历内容", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("日程日历")).toHaveCount(0);
  });

  test("R10 + 演示态 1：工作台入口 → 当前月、今日高亮、空态文案", async ({ page }) => {
    await registerAndOpenCalendar(page);

    const now = new Date();
    await expect(page.getByText(`${now.getFullYear()}年${now.getMonth() + 1}月`)).toBeVisible();
    // 今日格常亮（MonthGrid data-today）
    await expect(page.locator(`[data-date="${fmt(now)}"]`)).toHaveAttribute(
      "data-today",
      "true",
    );
    // 当日详情默认选中今天 + 空态文案（R6）
    await expect(page.getByText("这天还没有安排")).toBeVisible();
  });

  test("R1 演示态 2：创建带时间条目 → 详情与月格摘要即时更新，无秒位泄漏", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, { title: "高数复习", start: "14:00", end: "15:30" });

    // 详情面板：时间段行（HH:MM–HH:MM，无秒位——Review Focus #2）
    await expect(page.getByText("14:00–15:30")).toBeVisible();
    await expect(dayPanel(page).getByText("高数复习")).toBeVisible();
    await expect(page.getByText(/14:00:00/)).toHaveCount(0);
    // 月格摘要同步（HH:MM title 形态）
    await expect(page.locator(`[data-date="${today}"]`)).toContainText(
      "14:00 高数复习",
    );
  });

  test("R2 演示态 2：创建不带时间条目 → 与带时间条目并存", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, { title: "高数复习", start: "14:00", end: "15:30" });
    await expect(page.getByText("14:00–15:30")).toBeVisible();

    await createEntry(page, { title: "交英语作业" });
    await expect(dayPanel(page).getByText("交英语作业")).toBeVisible();
    // 不带时间行无时间前缀：同一面板内不应出现第二个时间前缀
    const rows = dayPanel(page).locator("ul > li");
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "交英语作业" })).not.toContainText("14:00");
  });

  test("R8 演示态 2：留空提交 E-01；开始=结束 E-03；开始留空结束禁用", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    // 留空提交 → E-01 且不提交（无条目产生）
    await page.getByRole("button", { name: "添加" }).click();
    await expect(page.getByText("请填写事项内容")).toBeVisible();
    await expect(page.getByText("这天还没有安排")).toBeVisible();

    // 开始留空 → 结束禁用；填开始 → 恢复
    const end = page.locator("#calendar-entry-end");
    await expect(end).toBeDisabled();
    await page.locator("#calendar-entry-start").fill("14:00");
    await expect(end).toBeEnabled();

    // 14:00 + 14:00 → E-03 且不提交
    await page.locator("#calendar-entry-title").fill("高数复习");
    await page.locator("#calendar-entry-end").fill("14:00");
    await page.getByRole("button", { name: "添加" }).click();
    await expect(page.getByText("结束时间需晚于开始时间")).toBeVisible();
    await expect(page.getByText("这天还没有安排")).toBeVisible();
  });

  test("R3 演示态 3：编辑即时生效；删除取消保留、确认消失（确认层无输入）", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, { title: "高数复习", start: "14:00", end: "15:30" });
    await expect(dayPanel(page).getByText("高数复习")).toBeVisible();

    // 编辑：改文字与时间
    await page.getByRole("button", { name: "编辑" }).click();
    await expect(page.locator("#calendar-entry-title")).toHaveValue("高数复习");
    await page.locator("#calendar-entry-title").fill("英语听力");
    await page.locator("#calendar-entry-start").fill("10:00");
    await page.locator("#calendar-entry-end").fill("11:00");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("10:00–11:00")).toBeVisible();
    await expect(dayPanel(page).getByText("英语听力")).toBeVisible();
    await expect(dayPanel(page).getByText("14:00–15:30")).toHaveCount(0);

    // 删除：确认层无输入控件（D-08），取消保留
    await page.getByRole("button", { name: "删除" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("input")).toHaveCount(0);
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dayPanel(page).getByText("英语听力")).toBeVisible();

    // 删除：确认后条目消失，回到空态
    await page.getByRole("button", { name: "删除" }).click();
    await dialog.getByRole("button", { name: "删除" }).click();
    await expect(dayPanel(page).getByText("这天还没有安排")).toBeVisible();
    await expect(dayPanel(page).getByText("英语听力")).toHaveCount(0);
  });

  test("R4 演示态 4：同日重叠时间段并存，全程无冲突提示", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, { title: "高数复习", start: "14:00", end: "15:30" });
    await expect(page.getByText("14:00–15:30")).toBeVisible();
    await createEntry(page, { title: "英语听力", start: "14:30", end: "15:00" });

    await expect(dayPanel(page).getByText("14:00–15:30")).toBeVisible();
    await expect(dayPanel(page).getByText("14:30–15:00")).toBeVisible();
    await expect(dayPanel(page).getByText(/冲突/)).toHaveCount(0);
  });

  test("R5 演示态 5：过去日期补记 → 归入昨日、月格摘要同步", async ({ page }) => {
    await registerAndOpenCalendar(page);

    const yesterdayDate = new Date(Date.now() - 86_400_000);
    const yesterday = fmt(yesterdayDate);
    // 跨月边界：昨日不在当前展示月时先导航到上月
    const now = new Date();
    if (yesterdayDate.getMonth() !== now.getMonth()) {
      await page.getByRole("link", { name: "上一月" }).click();
    }
    await page.locator(`[data-date="${yesterday}"]`).click();
    // 详情标题为所选过去日期（非「今天」）
    await expect(
      page.getByText(`${yesterdayDate.getMonth() + 1}月${yesterdayDate.getDate()}日`),
    ).toBeVisible();

    await createEntry(page, { title: "昨日补记", start: "09:00", end: "10:00" });
    await expect(dayPanel(page).getByText("09:00–10:00")).toBeVisible();
    await expect(page.locator(`[data-date="${yesterday}"]`)).toContainText(
      "昨日补记",
    );
  });

  test("R11 演示态 3：编辑改所属日期 → 原日期消失、新日期出现", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const now = new Date();
    const today = fmt(now);

    await page.locator(`[data-date="${today}"]`).click();
    await createEntry(page, { title: "待改期条目" });
    await expect(dayPanel(page).getByText("待改期条目")).toBeVisible();

    // 改期至相对日（today+2 天，可能跨月）；编辑在当前视图直接进行
    const targetDate = new Date(now.getTime() + 2 * 86_400_000);
    const target = fmt(targetDate);
    await page.getByRole("button", { name: "编辑" }).click();
    await page.locator("#calendar-entry-date").fill(target);
    await page.getByRole("button", { name: "保存" }).click();

    // 原日期不再展示（RSC 重验证后今日详情已无该条目；目标格摘要合法在场）
    await expect(dayPanel(page).getByText("待改期条目")).toHaveCount(0);

    // 新日期出现：跨月先导航到目标月
    if (targetDate.getMonth() !== now.getMonth()) {
      await page.getByRole("link", { name: "下一月" }).click();
    }
    await page.locator(`[data-date="${target}"]`).click();
    await expect(dayPanel(page).getByText("待改期条目")).toBeVisible();
  });

  test("R12 演示态 2：提交中重复点击不产生重复条目；保存失败呈 E-02 且原列表不变", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    // 拦截 action POST：延迟 1500ms 后放行（模拟慢保存窗口）
    await interceptActions(page, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue();
    });
    await page.locator("#calendar-entry-title").fill("高数复习");
    await page.getByRole("button", { name: "添加" }).click();
    await page.getByRole("button", { name: "添加" }).click({ force: true }); // 提交中重复点击

    // 最终恰一条目
    await expect(dayPanel(page).getByText("高数复习")).toBeVisible();
    await expect(dayPanel(page).locator("ul > li")).toHaveCount(1);

    // 保存失败：拦截改 abort（网络异常 → E-02），原列表不变
    await interceptActions(page, (route) => route.abort());
    await page.locator("#calendar-entry-title").fill("注定失败");
    await page.getByRole("button", { name: "添加" }).click();
    await expect(dayPanel(page).getByText("保存失败,请重试")).toBeVisible({ timeout: 10_000 });
    await expect(dayPanel(page).locator("ul > li")).toHaveCount(1); // 原列表不变
    await expect(dayPanel(page).getByText("注定失败")).toHaveCount(0);
  });

  test("Review Focus #3：?month= 非法值回退当前月正常渲染", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const now = new Date();

    for (const bad of ["9999-99", "2026-13", "not-a-month"]) {
      await page.goto(`/calendar?month=${bad}`);
      await expect(
        page.getByText(`${now.getFullYear()}年${now.getMonth() + 1}月`),
      ).toBeVisible();
      await expect(page.locator("[data-cell]")).toHaveCount(42);
    }
  });
});

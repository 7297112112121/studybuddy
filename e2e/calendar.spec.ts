import { expect, test, type Page } from "@playwright/test";

import { E2E_PASSWORD, registerViaUI, uniqueUsername } from "./helpers/auth";
import { createEntry, fmt } from "./helpers/calendar";

/** 拦截写端点 POST(统一接口 /api/calendar/entries)。 */
async function interceptEntryPosts(
  page: Page,
  handle: (route: import("@playwright/test").Route) => Promise<unknown>,
): Promise<void> {
  await page.route("**/api/calendar/entries**", (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      return handle(route);
    }
    return route.continue();
  });
}

/** 注册并直达月视图(?view=month 深链——非 auth 目标用例取最短进入路径)。 */
async function registerAndOpenCalendar(page: Page): Promise<void> {
  await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);
  await page.goto("/calendar?view=month");
}

/** 当日详情面板（断言锚点：月格摘要与详情行并存时收窄作用域）。 */
function dayPanel(page: Page) {
  return page.getByTestId("day-panel");
}

test.describe("AXY-22 日程日历", () => {
  test("R9：未登录直达 /calendar → 重定向 /login，响应不含日历内容", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("日程日历")).toHaveCount(0);
  });

  test("R10 + 演示态 1：工作台入口 → 默认周视图(AXY-23 D-02);月视图当前月、今日高亮、空态文案", async ({
    page,
  }) => {
    await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);

    const now = new Date();
    // 工作台入口 → /calendar 默认周视图(AXY-23 D-02):实时线在场即周视图证据
    await page.getByTestId("calendar-entry").click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByTestId("now-line")).toBeVisible();

    await page.goto("/calendar?view=month");
    await expect(
      page.getByText(`${now.getFullYear()}年${now.getMonth() + 1}月`),
    ).toBeVisible();
    // 今日格常亮（MonthGrid data-today）
    await expect(page.locator(`[data-date="${fmt(now)}"]`)).toHaveAttribute(
      "data-today",
      "true",
    );
    // 当日详情默认选中今天 + 空态文案（R6）
    await expect(page.getByText("这天还没有安排")).toBeVisible();
  });

  test("R1 演示态 2：创建带时间条目 → 详情与月格摘要即时更新，无秒位泄漏", async ({
    page,
  }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, {
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });

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

    await createEntry(page, {
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });
    await expect(page.getByText("14:00–15:30")).toBeVisible();

    await createEntry(page, { title: "交英语作业" });
    await expect(dayPanel(page).getByText("交英语作业")).toBeVisible();
    // 不带时间行无时间前缀：同一面板内不应出现第二个时间前缀
    const rows = dayPanel(page).locator("ul > li");
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "交英语作业" })).not.toContainText(
      "14:00",
    );
  });

  test("R8 演示态 2：留空提交 E-01；开始=结束 E-03；开始留空结束禁用", async ({
    page,
  }) => {
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

  test("R3 演示态 3：编辑即时生效；删除取消保留、确认消失（确认层无输入）", async ({
    page,
  }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, {
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });
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
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "删除" }).click();
    await expect(dayPanel(page).getByText("这天还没有安排")).toBeVisible();
    await expect(dayPanel(page).getByText("英语听力")).toHaveCount(0);
  });

  test("R4 演示态 4：同日重叠时间段并存，全程无冲突提示", async ({ page }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    await createEntry(page, {
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });
    await expect(page.getByText("14:00–15:30")).toBeVisible();
    await createEntry(page, {
      title: "英语听力",
      start: "14:30",
      end: "15:00",
    });

    await expect(dayPanel(page).getByText("14:00–15:30")).toBeVisible();
    await expect(dayPanel(page).getByText("14:30–15:00")).toBeVisible();
    await expect(dayPanel(page).getByText(/冲突/)).toHaveCount(0);
  });

  test("R5 演示态 5：过去日期补记 → 归入所选日、月格摘要同步", async ({
    page,
  }) => {
    await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);

    // 固定日历日字面(2026-01-01)+固定月深链:过去日期语义不随运行日漂移
    await page.goto("/calendar?view=month&month=2026-01");
    await page.locator('[data-date="2026-01-01"]').click();
    // 详情标题为所选过去日期（非「今天」）
    await expect(page.getByText("1月1日")).toBeVisible();

    await createEntry(page, {
      title: "元旦补记",
      start: "09:00",
      end: "10:00",
    });
    await expect(dayPanel(page).getByText("09:00–10:00")).toBeVisible();
    await expect(page.locator('[data-date="2026-01-01"]')).toContainText(
      "元旦补记",
    );
  });

  test("R11 演示态 3：编辑改所属日期跨月 → 原日期消失、新日期出现", async ({
    page,
  }) => {
    await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);

    // 固定跨月锚 2026-11-30 → 2026-12-01:跨月分支每次运行确定性执行
    await page.goto("/calendar?view=month&month=2026-11");
    await page.locator('[data-date="2026-11-30"]').click();
    await createEntry(page, { title: "待改期条目" });
    await expect(dayPanel(page).getByText("待改期条目")).toBeVisible();

    // 改期至跨月的固定日；编辑在当前视图直接进行
    await page.getByRole("button", { name: "编辑" }).click();
    await page.locator("#calendar-entry-date").fill("2026-12-01");
    await page.getByRole("button", { name: "保存" }).click();

    // 原日期不再展示（RSC 重验证后 11-30 详情已无该条目；目标格摘要合法在场）
    await expect(dayPanel(page).getByText("待改期条目")).toHaveCount(0);

    // 新日期出现：跨月导航到目标月
    await page.getByRole("link", { name: "下一月" }).click();
    await page.locator('[data-date="2026-12-01"]').click();
    await expect(dayPanel(page).getByText("待改期条目")).toBeVisible();
  });

  test("R12 演示态 2：提交中重复点击不产生重复条目；保存失败呈 E-02 且原列表不变", async ({
    page,
  }) => {
    await registerAndOpenCalendar(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();

    // 拦截写端点 POST：延迟 1500ms 后放行（模拟慢保存窗口）
    await interceptEntryPosts(page, async (route) => {
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
    await interceptEntryPosts(page, (route) => route.abort());
    await page.locator("#calendar-entry-title").fill("注定失败");
    await page.getByRole("button", { name: "添加" }).click();
    await expect(dayPanel(page).getByText("保存失败,请重试")).toBeVisible({
      timeout: 10_000,
    });
    await expect(dayPanel(page).locator("ul > li")).toHaveCount(1); // 原列表不变
    await expect(dayPanel(page).getByText("注定失败")).toHaveCount(0);
  });

  test("Review Focus #3：?month= 非法值回退当前月正常渲染", async ({
    page,
  }) => {
    await registerAndOpenCalendar(page);
    const now = new Date();

    for (const bad of ["9999-99", "2026-13", "not-a-month"]) {
      await page.goto(`/calendar?view=month&month=${bad}`);
      await expect(
        page.getByText(`${now.getFullYear()}年${now.getMonth() + 1}月`),
      ).toBeVisible();
      await expect(page.locator("[data-cell]")).toHaveCount(42);
    }
  });
});

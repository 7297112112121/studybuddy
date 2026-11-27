
import { expect, test, type Page } from "@playwright/test";

import { E2E_PASSWORD, registerViaUI, uniqueUsername } from "./helpers/auth";

/** Date → "YYYY-MM-DD"(本地时区字面日期)。 */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 注册并直达周视图(登录态已在,直接 goto)。 */
async function registerAndOpenWeek(page: Page): Promise<void> {
  await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/calendar$/);
}

/** 经月视图详情面板在给定日期创建条目(复用 AXY-22 形态)。 */
async function createViaMonth(
  page: Page,
  entry: { date: string; title: string; start?: string; end?: string },
): Promise<void> {
  await page.goto("/calendar?view=month");
  await page.locator(`[data-date="${entry.date}"]`).click();
  await page.locator("#calendar-entry-title").fill(entry.title);
  if (entry.start) {
    await page.locator("#calendar-entry-start").fill(entry.start);
  }
  if (entry.end) {
    await page.locator("#calendar-entry-end").fill(entry.end);
  }
  await page.getByRole("button", { name: "添加" }).click();
  await page.getByText(entry.title).first().waitFor();
}

/** 周视图网格里的色块(按标题过滤)。 */
function weekBlock(page: Page, title: string) {
  return page
    .locator('[data-testid^="week-block-"]')
    .filter({ hasText: title });
}

test.describe("AXY-23 日程周视图", () => {
  test("R1+R2+R11 演示态 1:默认今天所在周、色块与实时线、翻周隐藏/今天恢复", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaMonth(page, {
      date: today,
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });
    await page.goto("/calendar");

    // 默认今天所在周:今日列高亮,色块文字与时段可读(R1)
    const todayCol = page.getByTestId(`week-col-${today}`);
    await expect(todayCol).toHaveAttribute("aria-current", "date");
    await expect(weekBlock(page, "高数复习")).toBeVisible();

    // 实时线在场(R2/D-05:开屏即今天所在周,免切换可见)
    await expect(page.getByTestId("now-line")).toBeVisible();

    // 翻上一周 → 实时线隐藏;「今天」返回 → 恢复(R11)。导航为服务端 Link(asChild → <a>)
    await page.getByRole("link", { name: "上一周" }).click();
    await expect(page).toHaveURL(/\/calendar\?week=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByTestId("now-line")).toHaveCount(0);
    await expect(page.getByText("这周还没有安排")).toBeVisible();

    await page.getByRole("link", { name: "今天" }).click();
    await expect(page.getByTestId("now-line")).toBeVisible();
    await expect(weekBlock(page, "高数复习")).toBeVisible();
  });

  test("R8:窄屏 375px 周视图横向滚动,表头可见", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 720 },
    });
    const page = await context.newPage();
    await registerAndOpenWeek(page);

    const scroller = page.locator(".overflow-x-auto").first();
    const scrollable = await scroller.evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    );
    expect(scrollable).toBe(true);
    await expect(
      page.locator('[data-testid^="week-col-"]').first(),
    ).toBeVisible();
    await context.close();
  });

  test("R4 演示态 2:点槽创建 → 开始预填 14:30、终点默认 +1 小时,保存后色块出现", async ({
    page,
  }) => {
    await registerAndOpenWeek(page);

    await page
      .getByRole("button", { name: /14:30 新建条目/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("新建条目")).toBeVisible();
    await expect(dialog.locator("#calendar-entry-start")).toHaveValue("14:30");
    await expect(dialog.locator("#calendar-entry-end")).toHaveValue("15:30");

    await dialog.locator("#calendar-entry-title").fill("组会");
    await dialog.getByRole("button", { name: "添加" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(weekBlock(page, "组会")).toBeVisible();
  });

  test("R3 演示态 3:点色块编辑即时生效;删除确认后消失、取消保留", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaMonth(page, {
      date: today,
      title: "高数复习",
      start: "14:00",
      end: "15:30",
    });
    await page.goto("/calendar");

    // 编辑:卡内预填原值,改文字即时生效
    await weekBlock(page, "高数复习").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#calendar-entry-title")).toHaveValue(
      "高数复习",
    );
    await expect(dialog.locator("#calendar-entry-start")).toHaveValue("14:00");
    await dialog.locator("#calendar-entry-title").fill("高数冲刺");
    await dialog.getByRole("button", { name: "保存" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(weekBlock(page, "高数冲刺")).toBeVisible();
    await expect(weekBlock(page, "高数复习")).toHaveCount(0);

    // 删除:二次确认层,取消保留
    await weekBlock(page, "高数冲刺").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "删除" })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "取消" }).click();
    // 取消回到编辑卡(模态仍开)。等待确认层完全卸载后再按 Escape——
    // 关闭动画期间 Escape 会被尚在卸载的 alert 层吞掉(实测见裁决记录)
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(weekBlock(page, "高数冲刺")).toBeVisible();

    // 确认删除 → 色块消失,空周文案出现(R6)
    await weekBlock(page, "高数冲刺").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "删除" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "删除" })
      .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(weekBlock(page, "高数冲刺")).toHaveCount(0);
    await expect(page.getByText("这周还没有安排")).toBeVisible();
  });

  test("R5 演示态 4:不带时间条目仅展示于右栏未安排卡,可进编辑卡", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaMonth(page, { date: today, title: "交英语作业" });
    await page.goto("/calendar");

    const unscheduled = page.getByTestId("unscheduled-panel");
    await expect(unscheduled.getByText("交英语作业")).toBeVisible();
    await expect(weekBlock(page, "交英语作业")).toHaveCount(0);

    // 两卡互斥：无时间条目归未安排卡，今日日程卡只收已安排时间——不含、呈空态
    await expect(
      page.getByTestId("today-panel").getByText("交英语作业"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("today-panel").getByText("这天还没有安排"),
    ).toBeVisible();

    await unscheduled.getByRole("button", { name: "编辑" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#calendar-entry-title")).toHaveValue(
      "交英语作业",
    );
  });

  test("R6+R10 演示态 5:空周文案;周↔月切换数据一致、保持所在周、URL 恒 /calendar", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);

    // 空周(R6/E-04)
    await expect(page.getByText("这周还没有安排")).toBeVisible();

    // 切月视图(默认当前月) → 经面板创建 → 切回周视图数据一致(R6/R10)
    await page.getByRole("link", { name: "月", exact: true }).click();
    await expect(page).toHaveURL(/\/calendar\?view=month/);
    await expect(page.getByText("这天还没有安排")).toBeVisible();
    await page.locator(`[data-date="${today}"]`).click();
    await page.locator("#calendar-entry-title").fill("月视图建的条目");
    await page.getByRole("button", { name: "添加" }).click();
    await expect(page.getByText("月视图建的条目").first()).toBeVisible();

    await page.getByRole("link", { name: "周", exact: true }).click();
    await expect(page).toHaveURL(/\/calendar\?week=/);
    // 不带时间条目 → 右栏未安排卡(R5 形态),非色块
    await expect(
      page.getByTestId("unscheduled-panel").getByText("月视图建的条目"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/calendar/);
  });
});

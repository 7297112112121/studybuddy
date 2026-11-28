/**
 * 日程日历周视图 e2e(AXY-22+23 用例家族归并):月视图交互已随单屏双栏
 * 重做移除,原 AXY-22 月视图域用例按 e2e 纪律迁移归并于本文件。被测交互
 * 已不存在的用例删除:周↔月切换、编辑改所属日期(编辑卡无日期控件)、
 * ?month= 深链回退、迷你月历条目摘要(侧栏宽度裁决不带摘要)。
 * 周一锚深链用固定字面;今日锚语义(实时线/今日高亮/今日读域)保留真实时钟。
 */
import { expect, test, type Page, type Route } from "@playwright/test";

import { E2E_PASSWORD, registerViaUI, uniqueUsername } from "./helpers/auth";
import { createViaSlot, fmt, weekdayLabelOf } from "./helpers/calendar";

/** 注册并直达周视图(登录态已在,直接 goto)。 */
async function registerAndOpenWeek(page: Page): Promise<void> {
  await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/calendar$/);
}

/** 拦截写端点 POST(统一接口 /api/calendar/entries)。 */
async function interceptEntryPosts(
  page: Page,
  handle: (route: Route) => Promise<unknown>,
): Promise<void> {
  await page.route("**/api/calendar/entries**", (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      return handle(route);
    }
    return route.continue();
  });
}

/** 周视图网格里的色块(按标题过滤)。 */
function weekBlock(page: Page, title: string) {
  return page
    .locator('[data-testid^="week-block-"]')
    .filter({ hasText: title });
}

/** 右栏未安排时间卡(当前查看周的无时间条目)。 */
function unscheduledPanel(page: Page) {
  return page.getByTestId("unscheduled-panel");
}

/** 今日日程卡(今天已安排时间的条目)。 */
function todayPanel(page: Page) {
  return page.getByTestId("today-panel");
}

test.describe("AXY-22+23 日程日历周视图", () => {
  test("R9:未登录直达 /calendar → 重定向 /login,响应不含日历内容", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("日程日历")).toHaveCount(0);
  });

  test("R10+D-02:工作台入口 → 默认今天所在周,实时线在场", async ({ page }) => {
    await registerViaUI(page, uniqueUsername(), E2E_PASSWORD);
    await page.getByTestId("calendar-entry").click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByTestId("now-line")).toBeVisible();
  });

  test("R1+R2+R11 演示态1:默认今天所在周、色块与实时线、翻周隐藏/今天恢复", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaSlot(
      page,
      { title: "高数复习", start: "14:00", end: "15:30" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:00" },
    );
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

  test.describe("窄屏", () => {
    test.use({ viewport: { width: 375, height: 720 } });

    test("R8:窄屏 375px 周视图横向滚动,表头可见", async ({ page }) => {
      await registerAndOpenWeek(page);

      const scroller = page.locator(".overflow-x-auto").first();
      const scrollable = await scroller.evaluate(
        (el) => el.scrollWidth > el.clientWidth,
      );
      expect(scrollable).toBe(true);
      await expect(
        page.locator('[data-testid^="week-col-"]').first(),
      ).toBeVisible();
    });
  });

  test("R4 演示态2:点槽创建 → 开始预填 14:30、终点默认 +1 小时,保存后色块出现", async ({
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

  test("R3 演示态3:点色块编辑文字与时间即时生效;删除确认层无输入、取消保留确认消失", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaSlot(
      page,
      { title: "高数复习", start: "14:00", end: "15:30" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:00" },
    );

    // 编辑:卡内预填原值,改文字与时间即时生效
    await weekBlock(page, "高数复习").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#calendar-entry-title")).toHaveValue(
      "高数复习",
    );
    await expect(dialog.locator("#calendar-entry-start")).toHaveValue("14:00");
    await dialog.locator("#calendar-entry-title").fill("高数冲刺");
    await dialog.locator("#calendar-entry-start").fill("10:00");
    await dialog.locator("#calendar-entry-end").fill("11:00");
    await dialog.getByRole("button", { name: "保存" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(weekBlock(page, "高数冲刺")).toBeVisible();
    await expect(weekBlock(page, "高数复习")).toHaveCount(0);
    // 今日日程卡时段行随之更新(无秒位)
    await expect(todayPanel(page).getByText("10:00–11:00")).toBeVisible();

    // 删除:确认层无输入控件(D-08),取消保留
    await weekBlock(page, "高数冲刺").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "删除" })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await expect(confirm.locator("input")).toHaveCount(0);
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

  test("R5+R10 演示态4:不带时间条目仅展示于右栏未安排卡,可进编辑卡;跨周导航数据随周一致", async ({
    page,
  }) => {
    await registerAndOpenWeek(page);

    // 未安排卡新建:无时间预填
    await unscheduledPanel(page).getByRole("button", { name: "新建" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("#calendar-entry-title").fill("交英语作业");
    await dialog.getByRole("button", { name: "添加" }).click();
    await expect(dialog).toHaveCount(0);

    const unscheduled = unscheduledPanel(page);
    await expect(unscheduled.getByText("交英语作业")).toBeVisible();
    await expect(weekBlock(page, "交英语作业")).toHaveCount(0);

    // 两卡互斥:无时间条目归未安排卡,今日日程卡只收已安排时间——不含、呈空态
    await expect(todayPanel(page).getByText("交英语作业")).toHaveCount(0);
    await expect(todayPanel(page).getByText("这天还没有安排")).toBeVisible();

    // 编辑卡预填原值
    await unscheduled.getByRole("button", { name: "编辑" }).click();
    await expect(
      page.getByRole("dialog").locator("#calendar-entry-title"),
    ).toHaveValue("交英语作业");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // 跨周导航:固定周一字面深链 → 条目随查看周隐藏;「今天」返回 → 恢复(R10)
    await page.goto("/calendar?week=2026-11-09");
    await expect(unscheduled.getByText("交英语作业")).toHaveCount(0);
    await expect(
      unscheduled.getByText("本周没有未安排时间的事项"),
    ).toBeVisible();

    await page.getByRole("link", { name: "今天" }).click();
    await expect(page).toHaveURL(/\/calendar\?week=\d{4}-\d{2}-\d{2}$/);
    await expect(unscheduled.getByText("交英语作业")).toBeVisible();
  });

  test("R1 演示态2:创建带时间条目 → 今日日程详情行时段无秒位,色块在场", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaSlot(
      page,
      { title: "高数复习", start: "14:00", end: "15:30" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:00" },
    );

    // 今日日程卡时段行(HH:MM–HH:MM,无秒位——Review Focus #2)
    await expect(todayPanel(page).getByText("14:00–15:30")).toBeVisible();
    await expect(todayPanel(page).getByText("高数复习")).toBeVisible();
    await expect(page.getByText(/14:00:00/)).toHaveCount(0);
    await expect(weekBlock(page, "高数复习")).toBeVisible();
  });

  test("R2 演示态2:带时间与不带时间条目并存,各归其卡;未安排行不带时间前缀", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await createViaSlot(
      page,
      { title: "高数复习", start: "14:00", end: "15:30" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:00" },
    );

    await unscheduledPanel(page).getByRole("button", { name: "新建" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#calendar-entry-title").fill("交英语作业");
    await dialog.getByRole("button", { name: "添加" }).click();
    await expect(dialog).toHaveCount(0);

    await expect(todayPanel(page).getByText("14:00–15:30")).toBeVisible();
    const unscheduledRow = unscheduledPanel(page)
      .locator("ul > li")
      .filter({ hasText: "交英语作业" });
    await expect(unscheduledRow).toHaveCount(1);
    // 不带时间行以周几为行首,不出现时间前缀
    await expect(unscheduledRow).not.toContainText("14:00");
  });

  test("R8 演示态2:留空提交 E-01;开始留空结束禁用;开始=结束 E-03", async ({
    page,
  }) => {
    await registerAndOpenWeek(page);
    // 未安排卡新建:时间双预填空串
    await unscheduledPanel(page).getByRole("button", { name: "新建" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 留空提交 → E-01 且不提交
    await dialog.getByRole("button", { name: "添加" }).click();
    await expect(dialog.getByText("请填写事项内容")).toBeVisible();

    // 开始留空 → 结束禁用;填开始 → 恢复
    const end = dialog.locator("#calendar-entry-end");
    await expect(end).toBeDisabled();
    await dialog.locator("#calendar-entry-start").fill("14:00");
    await expect(end).toBeEnabled();

    // 14:00 + 14:00 → E-03 且不提交
    await dialog.locator("#calendar-entry-title").fill("高数复习");
    await dialog.locator("#calendar-entry-end").fill("14:00");
    await dialog.getByRole("button", { name: "添加" }).click();
    await expect(dialog.getByText("结束时间需晚于开始时间")).toBeVisible();
    await expect(unscheduledPanel(page).getByText("高数复习")).toHaveCount(0);
    await expect(weekBlock(page, "高数复习")).toHaveCount(0);
  });

  test("R4 演示态4:同日重叠时间段并存,全程无冲突提示", async ({ page }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    // 建条顺序对调:色块绝对定位会覆盖其时段内的槽位按钮(14:30 槽被
    // 14:00–15:30 色块遮挡,点槽会落进编辑卡)——先建 14:30–15:00,其
    // 14:30 槽位尚无遮挡;再建 14:00–15:30,14:00 槽位不被短色块覆盖。
    await createViaSlot(
      page,
      { title: "英语听力", start: "14:30", end: "15:00" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:30" },
    );
    await createViaSlot(
      page,
      { title: "高数复习", start: "14:00", end: "15:30" },
      { weekdayLabel: weekdayLabelOf(today), time: "14:00" },
    );

    await expect(todayPanel(page).getByText("14:00–15:30")).toBeVisible();
    await expect(todayPanel(page).getByText("14:30–15:00")).toBeVisible();
    await expect(page.getByText(/冲突/)).toHaveCount(0);
  });

  test("R5 演示态5:固定过去周深链补记 → 归入所选周,今日读域不串", async ({
    page,
  }) => {
    await registerAndOpenWeek(page);

    // 固定周一锚 2025-12-29(2026-01-01 所在周):过去日期语义不随运行日漂移
    await page.goto("/calendar?week=2025-12-29");
    await createViaSlot(
      page,
      { title: "元旦补记", start: "09:00", end: "10:00" },
      { weekdayLabel: "周四", time: "09:00" },
    );
    await expect(weekBlock(page, "元旦补记")).toBeVisible();
    // 今日日程卡是今天读域:查看过去周时今天的空态不受影响
    await expect(todayPanel(page).getByText("这天还没有安排")).toBeVisible();
  });

  test("R12 演示态2:提交中重复点击不产生重复条目;保存失败呈 E-02 且原列表不变", async ({
    page,
  }) => {
    const today = fmt(new Date());
    await registerAndOpenWeek(page);
    await page
      .getByRole("button", {
        name: `${weekdayLabelOf(today)} 14:00 新建条目`,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 拦截写端点 POST:延迟 1500ms 后放行(模拟慢保存窗口)
    await interceptEntryPosts(page, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue();
    });
    await dialog.locator("#calendar-entry-title").fill("高数复习");
    await dialog.getByRole("button", { name: "添加" }).click();
    await dialog.getByRole("button", { name: "添加" }).click({ force: true }); // 提交中重复点击

    // 最终恰一条目,对话框关闭
    await expect(dialog).toHaveCount(0);
    await expect(todayPanel(page).locator("ul > li")).toHaveCount(1);

    // 保存失败:拦截改 abort(网络异常 → E-02),原列表不变
    await interceptEntryPosts(page, (route) => route.abort());
    await page
      .getByRole("button", {
        name: `${weekdayLabelOf(today)} 09:00 新建条目`,
      })
      .click();
    const failDialog = page.getByRole("dialog");
    await expect(failDialog).toBeVisible();
    await failDialog.locator("#calendar-entry-title").fill("注定失败");
    await failDialog.getByRole("button", { name: "添加" }).click();
    await expect(failDialog.getByRole("alert")).toHaveText(/保存失败/);
    await expect(todayPanel(page).locator("ul > li")).toHaveCount(1); // 原列表不变
    await expect(todayPanel(page).getByText("注定失败")).toHaveCount(0);
  });
});

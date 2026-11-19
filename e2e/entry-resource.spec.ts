/**
 * AXY-24 E2E:条目 AI 资料提案(演示态 1/3,R9/R10)。
 *
 * AI 走 stub(DEEPSEEK_STUB_FIXTURE=1,playwright webServer 注入):
 * 语料以服务端「今天」为锚动态生成(T8 spec 断言用同样的 offset 计算,
 * 不随真实日历漂移)。断言口径为「结构 + 行为」(design 边界 #6):
 * 按天、含资料、可删改、原条目不变,不针对 AI 具体文字。
 */
import { expect, test, type Page } from "@playwright/test";

import {
  E2E_PASSWORD,
  registerViaUI,
  throttleSignIn,
  uniqueUsername,
} from "./helpers/auth";

/** 服务端 stub 同款偏移日期(以浏览器本地「今天」为锚)。 */
function offsetDate(offset: number): string {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmt(now: Date): string {
  return offsetDateAt(now, 0);
}

function offsetDateAt(now: Date, offset: number): string {
  const copy = new Date(now);
  copy.setDate(copy.getDate() + offset);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, "0");
  const d = String(copy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayPanel(page: Page) {
  return page.getByTestId("day-panel");
}

async function registerAndOpenMonth(page: Page): Promise<void> {
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
  await page.goto("/calendar?view=month");
}

/** 经当日详情面板底部表单创建条目并等待行出现。 */
async function createEntry(page: Page, title: string): Promise<void> {
  await page.locator(`[data-date="${fmt(new Date())}"]`).click();
  await page.locator("#calendar-entry-title").fill(title);
  await page.getByRole("button", { name: "添加" }).click();
  await expect(dayPanel(page).getByText(title)).toBeVisible();
}

async function openProposal(page: Page): Promise<void> {
  await dayPanel(page)
    .getByRole("button", { name: "帮我找资料" })
    .click();
  await expect(page.getByText("AI 资料提案")).toBeVisible();
  await expect(page.getByText("正在生成提案…")).toHaveCount(0);
}

test.describe("AXY-24 条目 AI 资料提案", () => {
  test("AC-1 演示态 1:发起 → 按天提案清单,确认前日程零新增,关闭即放弃", async ({
    page,
  }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架 11.20–11.30");

    await openProposal(page);

    // 按天清单:三条安排(输入值断言),每条带资料链接
    const dialog = page.getByRole("dialog");
    const texts = await dialog.getByLabel("安排").all();
    expect(texts).toHaveLength(3);
    await expect(dialog.getByLabel("安排").first()).toHaveValue(
      /Next\.js/,
    );
    await expect(dialog.getByRole("link").first()).toBeVisible();

    // 未确认前日程零新增:d(1) 的月格不含提案安排文字
    const d1 = offsetDate(1);
    await expect(
      page.locator(`[data-date="${d1}"]`).getByText(/Next\.js/),
    ).toHaveCount(0);

    // 关闭即放弃:浮层消失,日程仍无新增
    await dialog.getByRole("button", { name: "关闭" }).click();
    await expect(page.getByText("AI 资料提案")).toHaveCount(0);
    await expect(
      page.locator(`[data-date="${d1}"]`).getByText(/Next\.js/),
    ).toHaveCount(0);
  });

  test("AC-2 + AC-3 演示态 3:删改确认 → 仅保留条目写入、原条目不变,资料留存可查", async ({
    page,
  }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架 11.20–11.30");

    await openProposal(page);
    const dialog = page.getByRole("dialog");

    // 删两条,改剩余一条文字
    const deleteButtons = dialog.getByRole("button", { name: "删除" });
    await deleteButtons.nth(2).click();
    await deleteButtons.nth(1).click();
    const remaining = dialog.getByLabel("安排").first();
    await remaining.fill("改后的安排");

    await dialog.getByRole("button", { name: "确认写入" }).click();
    await expect(page.getByText("AI 资料提案")).toHaveCount(0);

    // 仅确认条目写入 d(1);原条目仍在今天
    const d1 = offsetDate(1);
    await page.goto(
      `/calendar?view=month&month=${d1.slice(0, 7)}`,
    );
    await expect(
      page.locator(`[data-date="${d1}"]`).getByText("改后的安排"),
    ).toBeVisible();

    // 原条目保持不变(今天的月格与详情都有原文)
    await page.goto("/calendar?view=month");
    await page.locator(`[data-date="${fmt(new Date())}"]`).click();
    await expect(dayPanel(page).getByText("学习next框架 11.20–11.30")).toBeVisible();

    // AC-3 资料留存:点开写入日,详情行可见资料链接
    await page.goto(`/calendar?view=month&month=${d1.slice(0, 7)}`);
    await page.locator(`[data-date="${d1}"]`).click();
    await expect(dayPanel(page).getByText("改后的安排")).toBeVisible();
    const link = dayPanel(page).getByRole("link", { name: "Next.js 官方文档" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("R9 重新生成:再次发起出同一提案语料,确认前日程零新增", async ({
    page,
  }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架 11.20–11.30");

    await openProposal(page);
    await page.getByRole("dialog").getByRole("button", { name: "关闭" }).click();

    await openProposal(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("安排")).toHaveCount(3);
    await dialog.getByRole("button", { name: "关闭" }).click();

    const d1 = offsetDate(1);
    await expect(
      page.locator(`[data-date="${d1}"]`).getByText(/Next\.js/),
    ).toHaveCount(0);
  });

  test("R10 生成中:进行中文案呈现、确认/重新生成不在场;完成后清单出现", async ({
    page,
  }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架 11.20–11.30");

    // 延迟提案 action,捕获生成中状态(沿 calendar.spec 拦截先例)
    await page.route("**/calendar*", (route) => {
      const req = route.request();
      if (
        req.method() === "POST" &&
        req.headers()["next-action"] !== undefined
      ) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(route.continue()), 1200);
        });
      }
      return route.continue();
    });

    await dayPanel(page).getByRole("button", { name: "帮我找资料" }).click();
    await expect(page.getByText("正在生成提案…")).toBeVisible();
    await expect(page.getByRole("button", { name: "确认写入" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "重新生成" })).toHaveCount(0);

    // 完成后清单出现
    await expect(page.getByRole("dialog").getByLabel("安排")).toHaveCount(3);
    await expect(page.getByText("正在生成提案…")).toHaveCount(0);
  });
});

test.describe("AXY-24 提案:周视图入口与边界态", () => {
  test("AC-1 周视图入口:色块编辑卡发起 → 同一提案浮层", async ({ page }) => {
    await registerAndOpenMonth(page);
    const today = fmt(new Date());
    await page.locator(`[data-date="${today}"]`).click();
    await page.locator("#calendar-entry-title").fill("学习next框架 11.20–11.30");
    await page.locator("#calendar-entry-start").fill("14:00");
    await page.locator("#calendar-entry-end").fill("15:30");
    await page.getByRole("button", { name: "添加" }).click();
    await expect(dayPanel(page).getByText("学习next框架 11.20–11.30")).toBeVisible();

    await page.goto("/calendar");
    await page
      .locator('[data-testid^="week-block-"]')
      .filter({ hasText: "学习next框架" })
      .click();
    await expect(page.getByText("编辑条目")).toBeVisible();
    await page.getByRole("button", { name: "帮我找资料" }).click();

    await expect(page.getByText("AI 资料提案")).toBeVisible();
    await expect(page.getByText("正在生成提案…")).toHaveCount(0);
    await expect(page.getByRole("dialog").getByLabel("安排")).toHaveCount(3);
    // 编辑卡已关闭(发起后浮出提案层,不叠卡)
    await expect(page.getByText("编辑条目")).toHaveCount(0);
  });

  test("R3 演示态 2:无范围条目先追问;无效答复 E-06 再答;有效答复出清单", async ({
    page,
  }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架");

    await openProposal(page);
    await expect(page.getByText("打算学到哪天?")).toBeVisible();
    const answer = page.getByLabel("打算学到哪天?");
    await expect(answer).toHaveAttribute("maxLength", "200");

    // 无效答复 → E-06 于输入框下方,可再答
    await answer.fill("随便");
    await page.getByRole("button", { name: "继续" }).click();
    await expect(
      page.getByText("没看懂这个时间,把它写成起止日期(如 11.20–11.30)再试试"),
    ).toBeVisible();

    // 有效答复 → 清单
    await answer.fill("到月底");
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByRole("dialog").getByLabel("安排")).toHaveCount(3);
  });

  test("F-01 追问答复留空被拦,呈现 E-01 不发请求", async ({ page }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架");

    await openProposal(page);
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("请输入你打算的时间,或取消")).toBeVisible();
  });

  test("AC-4 演示态 4:非学习类条目明确告知不适用,日程不变", async ({ page }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "买牛奶");

    await openProposal(page);
    await expect(page.getByText("这条日程不需要找资料")).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("安排")).toHaveCount(0);

    await page.getByRole("dialog").getByRole("button", { name: "关闭" }).click();
    await expect(page.getByText("AI 资料提案")).toHaveCount(0);
    await expect(dayPanel(page).getByText("买牛奶")).toBeVisible();
  });

  test("AC-5 演示态 4:没找到连同理由一起告知,不出凑数清单", async ({ page }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "冷门主题调研 11.20-11.30");

    await openProposal(page);
    await expect(
      page.getByText("没找到合适的资料:该主题缺少系统性的公开学习资料"),
    ).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("安排")).toHaveCount(0);
  });

  test("AC-6 演示态 5:服务不可用明确提示可重试;重试重新发起", async ({ page }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "触发AI故障 11.20-11.30");

    await openProposal(page);
    await expect(page.getByText("AI 服务暂时不可用,请稍后重试")).toBeVisible();
    await expect(page.getByRole("button", { name: "重试" })).toBeVisible();

    await page.getByRole("button", { name: "重试" }).click();
    // stub 恒定不可用:重试后仍呈现 E-04(stub 语料不模拟恢复)
    await expect(page.getByText("AI 服务暂时不可用,请稍后重试")).toBeVisible();
  });

  test("E-05 写入失败:整单未落,提案保留可重试;恢复后成功", async ({ page }) => {
    await registerAndOpenMonth(page);
    await createEntry(page, "学习next框架 11.20–11.30");

    await openProposal(page);
    const dialog = page.getByRole("dialog");
    const d1 = offsetDate(1);

    // 拦截确认写入 action(载荷含 days 字段),注入失败
    await page.route("**/calendar*", (route) => {
      const req = route.request();
      const body = req.postData() ?? "";
      if (
        req.method() === "POST" &&
        req.headers()["next-action"] !== undefined &&
        body.includes('"days"')
      ) {
        return route.abort();
      }
      return route.continue();
    });

    await dialog.getByRole("button", { name: "确认写入" }).click();
    await expect(
      page.getByText("写入日程失败,你的日程未改动,请重试"),
    ).toBeVisible();
    // 提案保留可重试
    await expect(dialog.getByLabel("安排")).toHaveCount(3);

    // 解除拦截后重试成功
    await page.unroute("**/calendar*");
    await dialog.getByRole("button", { name: "确认写入" }).click();
    await expect(page.getByText("AI 资料提案")).toHaveCount(0);
    await page.goto(`/calendar?view=month&month=${d1.slice(0, 7)}`);
    await expect(
      page.locator(`[data-date="${d1}"]`).getByText("阅读 Next.js 官方文档基础篇"),
    ).toBeVisible();
  });
});

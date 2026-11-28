/**
 * 日历 e2e 共享基座(多消费者唯一实现):本地时区字面日期、周几标签派生、
 * 编辑卡表单填充与点槽建条收口。单消费者定位器(如周视图 weekBlock)
 * 留各 spec 文件内。
 */
import { expect, type Page } from "@playwright/test";

/** Date → "YYYY-MM-DD"(本地时区字面日期)。 */
export function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 周几 key(周一首,与产品 utils WEEKDAY_KEYS 同序) → 表头词条标签。 */
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAY_LABELS: Record<(typeof WEEKDAY_KEYS)[number], string> = {
  mon: "周一",
  tue: "周二",
  wed: "周三",
  thu: "周四",
  fri: "周五",
  sat: "周六",
  sun: "周日",
};

/** 日期字面 → 槽位按钮名里的周几标签(如 "2026-11-28" → "周五")。 */
export function weekdayLabelOf(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay(); // 0=周日
  return WEEKDAY_LABELS[WEEKDAY_KEYS[(day + 6) % 7]];
}

/** 编辑卡表单填充(前置:对话框表单已开;字段留空则保留预填)。 */
export async function createEntry(
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

/**
 * 点槽建条基座:点「周X HH:MM 新建条目」槽位 → 编辑卡填充 → 保存收口
 * (对话框关闭)。槽位按钮名全网格唯一(周几+时间),即按列精确定位;
 * 前置:当前可见周即目标条目所在周。
 */
export async function createViaSlot(
  page: Page,
  entry: { title: string; start: string; end?: string },
  slot: { weekdayLabel: string; time: string },
): Promise<void> {
  await page
    .getByRole("button", {
      name: `${slot.weekdayLabel} ${slot.time} 新建条目`,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await createEntry(page, entry);
  await expect(dialog).toHaveCount(0);
}

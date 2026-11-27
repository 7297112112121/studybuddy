/**
 * 日历 e2e 共享基座(多消费者唯一实现):本地时区字面日期与详情面板
 * 建条表单填充。单消费者定位器(如周视图 weekBlock)留各 spec 文件内。
 */
import { type Page } from "@playwright/test";

/** Date → "YYYY-MM-DD"(本地时区字面日期)。 */
export function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 经详情面板底部表单创建条目(前置:目标日详情面板已开)。 */
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

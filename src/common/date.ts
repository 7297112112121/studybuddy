/** 一天的 UTC 毫秒数(字面日期运算的公共底座)。 */
export const MS_PER_DAY = 86_400_000;

/** 平闰年该月天数(month 为 1–12)。 */
export function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
}

/** UTC 时间戳 → "YYYY-MM-DD"(零填充)。 */
export function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

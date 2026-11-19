/**
 * MonthGrid 组件测试（AXY-22 Task 7，design「UI 与组件」节）。
 *
 * 覆盖 tasks.md Task 7「失败测试」行：42 格、今日/选中格标识可区分、
 * 条目按格归位与「HH:MM title」摘要形态、超 2 条「+N」计数、
 * 点击格回调 onSelect。纯展示组件（无文案键、无 action）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import MonthGrid from "@/modules/calendar/components/MonthGrid";
import calendarMessages from "@/locales/zh-CN/calendar.json";

const entries = [
  {
    id: "e1",
    date: "2026-11-17",
    title: "高数复习",
    startTime: "14:00",
    endTime: "15:30",
  },
  {
    id: "e2",
    date: "2026-11-17",
    title: "交英语作业",
    startTime: null,
    endTime: null,
  },
];

afterEach(cleanup);

function renderGrid(
  overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {},
) {
  const onSelect = overrides.onSelect ?? vi.fn();
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <MonthGrid
        year={2026}
        month={11}
        today={overrides.today ?? "2026-11-17"}
        entries={overrides.entries ?? entries}
        selectedDate={overrides.selectedDate ?? "2026-11-20"}
        onSelect={onSelect}
      />
    </NextIntlClientProvider>,
  );
  return { onSelect };
}

describe("MonthGrid（tests/calendar/components/MonthGrid）", () => {
  it("① 渲染恰 42 格", () => {
    renderGrid();
    expect(document.querySelectorAll("[data-cell]")).toHaveLength(42);
  });

  it("② 今日格与选中格标识可区分（不同单元格、类名不同）", () => {
    renderGrid();
    const todayCell = document.querySelector(
      '[data-today="true"]',
    ) as HTMLElement;
    const selectedCell = document.querySelector(
      '[data-selected="true"]',
    ) as HTMLElement;
    expect(todayCell.dataset.date).toBe("2026-11-17");
    expect(selectedCell.dataset.date).toBe("2026-11-20");
    expect(todayCell.className).not.toBe(selectedCell.className);
  });

  it("③ 条目按格归位：11-17 两条 → 该格两摘要行，带时间行以 '14:00 ' 前缀", () => {
    renderGrid();
    const cell = document.querySelector(
      '[data-date="2026-11-17"]',
    ) as HTMLElement;
    expect(cell.textContent).toContain("14:00 高数复习");
    expect(cell.textContent).toContain("交英语作业");
  });

  it("④ 3 条目 → 该格 2 摘要行 + 「+1」", () => {
    renderGrid({
      entries: [
        ...entries,
        {
          id: "e3",
          date: "2026-11-17",
          title: "第三条",
          startTime: "20:00",
          endTime: null,
        },
      ],
    });
    const cell = document.querySelector(
      '[data-date="2026-11-17"]',
    ) as HTMLElement;
    expect(cell.textContent).toContain("14:00 高数复习");
    expect(cell.textContent).toContain("交英语作业");
    expect(cell.textContent).not.toContain("第三条");
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("⑤ 点击非选中格 → onSelect 以该格 date 被调", () => {
    const { onSelect } = renderGrid();
    fireEvent.click(
      document.querySelector('[data-date="2026-11-20"]') as HTMLElement,
    );
    expect(onSelect).toHaveBeenCalledWith("2026-11-20");
  });

  it("⑥ 星期表头：周一至周日（一…日）按序渲染在月格之前", () => {
    renderGrid();
    const labels = [...document.querySelectorAll("[data-weekday]")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["一", "二", "三", "四", "五", "六", "日"]);
  });
});

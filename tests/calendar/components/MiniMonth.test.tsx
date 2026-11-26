/**
 * MiniMonth 组件测试。
 *
 * 覆盖:今日章常亮(data-today + bg-primary)、URL 所示周整周高亮
 * (data-in-week 恰 7 格)、今日章优先于周高亮(不叠 bg-accent)、邻月补位格
 * 弱化、点日期格 onSelect 带格内日期、翻月回调、星期表头首列周一。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import MiniMonth from "@/features/calendar/components/MiniMonth";
import { buildWeekDays } from "@/features/calendar/dates";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

const today = "2026-11-18";
const weekDates = buildWeekDays("2026-11-16", today).map((day) => day.date);

function renderMini(
  overrides: Partial<React.ComponentProps<typeof MiniMonth>> = {},
) {
  const props = {
    year: 2026,
    month: 11,
    today,
    weekDates,
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <MiniMonth {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

function cell(date: string): HTMLElement {
  return document.querySelector(`[data-date="${date}"]`) as HTMLElement;
}

describe("MiniMonth", () => {
  it("今日格常亮:data-today 且 bg-primary 章;标题为「2026年11月」", () => {
    render(
      <NextIntlClientProvider
        locale="zh-CN"
        messages={{ calendar: calendarMessages }}
      >
        <MiniMonth
          year={2026}
          month={11}
          today={today}
          weekDates={weekDates}
          onPrevMonth={vi.fn()}
          onNextMonth={vi.fn()}
          onSelect={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("2026年11月")).toBeTruthy();
    const todayCell = cell("2026-11-18");
    expect(todayCell.getAttribute("data-today")).toBe("true");
    expect(todayCell.classList.contains("bg-primary")).toBe(true);
  });

  it("URL 所示周整周高亮:恰 7 格 data-in-week,日期集与 weekDates 一致", () => {
    renderMini();
    const inWeek = [
      ...document.querySelectorAll<HTMLElement>('[data-in-week="true"]'),
    ];
    expect(inWeek).toHaveLength(7);
    expect(inWeek.map((el) => el.getAttribute("data-date")).sort()).toEqual(
      [...weekDates].sort(),
    );
    // 周外格不高亮
    expect(cell("2026-11-25").getAttribute("data-in-week")).toBe("false");
  });

  it("今日在周内 → 今日章优先于周高亮(不叠 bg-accent)", () => {
    renderMini();
    expect(cell("2026-11-18").classList.contains("bg-accent")).toBe(false);
  });

  it("邻月补位格弱化:text-muted-foreground/60(2026-11 首格为 10-26)", () => {
    renderMini();
    expect(
      cell("2026-10-26").classList.contains("text-muted-foreground/60"),
    ).toBe(true);
  });

  it("点日期格 → onSelect 以格内日期被调", () => {
    const props = renderMini();
    fireEvent.click(cell("2026-11-20"));
    expect(props.onSelect).toHaveBeenCalledWith("2026-11-20");
  });

  it("翻月:上一月/下一月按钮分别触发 onPrevMonth/onNextMonth", () => {
    const props = renderMini();
    fireEvent.click(screen.getByRole("button", { name: "上一月" }));
    fireEvent.click(screen.getByRole("button", { name: "下一月" }));
    expect(props.onPrevMonth).toHaveBeenCalledOnce();
    expect(props.onNextMonth).toHaveBeenCalledOnce();
  });

  it("星期表头:首列周一,7 列齐", () => {
    renderMini();
    const weekdays = document.querySelectorAll("[data-weekday]");
    expect(weekdays).toHaveLength(7);
    expect(weekdays[0].textContent).toBe("一");
  });
});

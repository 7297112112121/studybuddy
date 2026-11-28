/**
 * WeekHeader 组件测试。
 *
 * 覆盖:星期名与日期数字逐列渲染、今天列 aria-current=date 与 primary 胶囊、
 * 非今天列弱化色与无胶囊底、空周只留占位。
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import WeekHeader from "@/features/calendar/components/WeekHeader";
import { buildWeekDays } from "@/features/calendar/utils";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

const WEEK_START = "2026-11-16";
const TODAY = "2026-11-18";

function Header({ days }: { days?: React.ComponentProps<typeof WeekHeader>["days"] }) {
  return (
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <WeekHeader days={days ?? buildWeekDays(WEEK_START, TODAY)} />
    </NextIntlClientProvider>
  );
}

describe("WeekHeader", () => {
  it("逐列渲染星期名与日期数字（2026-11-16 起一周 16–22）", () => {
    render(<Header />);
    for (const date of ["16", "17", "18", "19", "20", "21", "22"]) {
      expect(screen.getByText(date)).toBeTruthy();
    }
    expect(screen.getByText(calendarMessages.weekday.mon)).toBeTruthy();
    expect(screen.getByText(calendarMessages.weekday.sun)).toBeTruthy();
  });

  it("今天列 aria-current=date、text-primary、胶囊 bg-primary;非今天列弱化色无胶囊底", () => {
    render(<Header />);

    const todayCol = screen.getByTestId("week-col-2026-11-18");
    expect(todayCol.getAttribute("aria-current")).toBe("date");
    expect(todayCol.className).toContain("text-primary");
    expect(todayCol.className).not.toContain("text-muted-foreground");
    expect(todayCol.className).toContain("flex flex-col");
    const todayCapsule = todayCol.querySelector(
      "span:last-child",
    ) as HTMLElement;
    expect(todayCapsule.className).toContain("bg-primary");
    expect(todayCapsule.className).toContain("text-primary-foreground");
    expect(todayCapsule.className).toContain("tabular-nums");

    const otherCol = screen.getByTestId("week-col-2026-11-16");
    expect(otherCol.getAttribute("aria-current")).toBeNull();
    expect(otherCol.className).toContain("text-muted-foreground");
    expect(otherCol.className).not.toContain("text-primary");
    const otherCapsule = otherCol.querySelector(
      "span:last-child",
    ) as HTMLElement;
    expect(otherCapsule.className).not.toContain("bg-primary");
    expect(otherCapsule.className).not.toContain("text-primary-foreground");
  });

  it("空周只渲染占位,不产出任何日期列", () => {
    render(<Header days={[]} />);
    expect(screen.queryByTestId("week-col-2026-11-18")).toBeNull();
    expect(screen.queryByText(calendarMessages.weekday.mon)).toBeNull();
  });
});

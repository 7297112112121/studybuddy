/**
 * MiniMonthCard 组件测试。
 *
 * 覆盖:显示月初值随 URL 周所在月、翻月回调接线、key 重挂载语义——
 * 同月翻周手动翻月态保留、跨月跳周重挂载回落所在月。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import MiniMonthCard from "@/features/calendar/components/MiniMonthCard";
import { buildWeekDays } from "@/features/calendar/utils";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

const today = "2026-11-18";

type CardProps = React.ComponentProps<typeof MiniMonthCard>;

function Card(props: Pick<CardProps, "weekStart">) {
  return (
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <MiniMonthCard
        weekStart={props.weekStart}
        today={today}
        weekDates={buildWeekDays(props.weekStart, today).map((day) => day.date)}
        onSelect={vi.fn()}
      />
    </NextIntlClientProvider>
  );
}

describe("MiniMonthCard", () => {
  it("显示月初值随 URL 周所在月（2026-11-16 → 2026年11月）", () => {
    render(<Card weekStart="2026-11-16" />);
    expect(screen.getByText("2026年11月")).toBeTruthy();
  });

  it("翻月接线：下一月 → 2026年12月", () => {
    render(<Card weekStart="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: "下一月" }));
    expect(screen.getByText("2026年12月")).toBeTruthy();
  });

  it("翻月接线：上一月 → 2026年10月", () => {
    render(<Card weekStart="2026-11-16" />);
    fireEvent.click(
      screen.getByRole("button", { name: calendarMessages.page.prevMonth }),
    );
    expect(screen.getByText("2026年10月")).toBeTruthy();
  });

  it("key 重挂载语义：同月翻周翻月态保留，跨月跳周回落所在月", () => {
    const { rerender } = render(<Card key="2026-11" weekStart="2026-11-16" />);
    fireEvent.click(screen.getByRole("button", { name: "下一月" }));
    fireEvent.click(screen.getByRole("button", { name: "下一月" }));
    expect(screen.getByText("2027年1月")).toBeTruthy();

    // 同月内翻周：key 不变 → 不重挂载 → 手动翻月态保留
    rerender(<Card key="2026-11" weekStart="2026-11-23" />);
    expect(screen.getByText("2027年1月")).toBeTruthy();

    // 跨月跳周：key 变 → 重挂载 → 回落 URL 周所在月
    rerender(<Card key="2026-12" weekStart="2026-12-07" />);
    expect(screen.getByText("2026年12月")).toBeTruthy();
    expect(screen.queryByText("2027年1月")).toBeNull();
  });
});

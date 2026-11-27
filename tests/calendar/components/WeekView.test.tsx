/**
 * WeekView 组件测试(AXY-23 tasks.md Task 8「失败测试」行)。
 *
 * 覆盖:整周无条目 E-04 逐字、无时间条目不进周视图(归右栏未安排卡)、
 * 色块文字与时段可读、实时线可见性(Review Focus 5)、槽位 aria-label
 * (createAt 插值)、卡片头部翻周链接。编辑卡开合在页面级,本层 props 透传。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import WeekView from "@/features/calendar/components/WeekView";
import { buildWeekDays } from "@/features/calendar/dates";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import type { CalendarEntryView } from "@/modules/calendar/queries";

afterEach(cleanup);

const days = buildWeekDays("2026-11-16", "2026-11-18");
const daysAway = buildWeekDays("2026-11-16", "2026-11-30");

function entry(
  id: string,
  date: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
): CalendarEntryView {
  return { id, date, title, content: null, startTime, endTime };
}

function renderView(
  entries: CalendarEntryView[],
  weekDays = days,
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <WeekView
        days={weekDays}
        entries={entries}
        nav={{
          prevHref: "/calendar?week=2026-11-09",
          todayHref: "/calendar?week=2026-11-16",
          nextHref: "/calendar?week=2026-11-23",
        }}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("WeekView(AXY-23 Task 8)", () => {
  it("卡片头部翻周链接:前/今天/后 href 逐字承接 nav prop", () => {
    renderView([]);
    expect(
      screen.getByRole("link", { name: "上一周" }).getAttribute("href"),
    ).toBe("/calendar?week=2026-11-09");
    expect(screen.getByRole("link", { name: "今天" }).textContent).toBe("今天");
    expect(
      screen.getByRole("link", { name: "今天" }).getAttribute("href"),
    ).toBe("/calendar?week=2026-11-16");
    expect(
      screen.getByRole("link", { name: "下一周" }).getAttribute("href"),
    ).toBe("/calendar?week=2026-11-23");
  });

  it("整周无条目 → E-04 逐字「这周还没有安排」", () => {
    renderView([]);
    expect(screen.getByText("这周还没有安排")).toBeTruthy();
  });

  it("无时间条目不渲染于周视图(归右栏未安排卡),时间网格无对应色块", () => {
    renderView([entry("e1", "2026-11-18", "交英语作业", null, null)]);

    expect(screen.queryByText("交英语作业")).toBeNull();
    expect(screen.queryByTestId("week-block-e1")).toBeNull();
    expect(screen.queryByText("这周还没有安排")).toBeNull();
  });

  it("带时间条目渲染为色块,文字与时段可读(14:00–15:30)", () => {
    renderView([entry("e2", "2026-11-18", "高数复习", "14:00", "15:30")]);

    const block = screen.getByTestId("week-block-e2");
    expect(block.textContent).toContain("高数复习");
    expect(block.textContent).toContain("14:00");
    expect(screen.queryByText("这周还没有安排")).toBeNull();
  });

  it("时间点条目渲染为 30 分钟高短色块(D-12)", () => {
    renderView([entry("e3", "2026-11-17", "晨读", "07:00", null)]);

    const block = screen.getByTestId("week-block-e3");
    expect(block.style.height).toBe("60px"); // 30 分钟 × 2px/分
    expect(block.textContent).toContain("07:00");
  });

  it("实时线可见性:days 含 today → 渲染;不含 → 不渲染(Review Focus 5)", () => {
    const { unmount } = renderView([], days);
    expect(screen.getByTestId("now-line")).toBeTruthy();
    unmount();

    renderView([], daysAway);
    expect(screen.queryByTestId("now-line")).toBeNull();
  });

  it("实时线左端显示当前实时时间;整点时不重复显示(由高亮刻度承担)", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 10, 18, 11, 28, 0));
      renderView([], days);
      expect(screen.getByTestId("now-line-time").textContent).toBe("11:28");
      cleanup();

      vi.setSystemTime(new Date(2026, 10, 18, 11, 0, 0));
      renderView([], days);
      expect(screen.queryByTestId("now-line-time")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("实时线分段:今天列段亮红加粗,其余列段淡红暗淡", () => {
    renderView([], days); // today 2026-11-18 → 第 3 列(index 2)
    // 底衬线由容器自身承担:h-px 保证实际包围盒非零(E2E toBeVisible 依赖)
    const line = screen.getByTestId("now-line");
    expect(line.classList.contains("h-px")).toBe(true);
    expect(line.classList.contains("bg-destructive/40")).toBe(true);
    const bright = screen.getByTestId("now-line-today");
    expect(bright.classList.contains("bg-destructive")).toBe(true);
    expect(Number.parseFloat(bright.style.left)).toBeCloseTo((2 * 100) / 7, 2);
    expect(Number.parseFloat(bright.style.width)).toBeCloseTo(100 / 7, 2);
    // 高亮段左端实心圆点锚点(如图样式)
    const dot = screen.getByTestId("now-line-dot");
    expect(dot.classList.contains("bg-destructive")).toBe(true);
    expect(dot.classList.contains("rounded-full")).toBe(true);
  });

  it("实时线到达整点 → 时间轴该小时标签高亮(destructive);非整点不高亮", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 10, 18, 11, 0, 0));
      renderView([], days);
      expect(
        screen
          .getByTestId("week-hour-11")
          .classList.contains("text-destructive"),
      ).toBe(true);
      cleanup();

      vi.setSystemTime(new Date(2026, 10, 18, 11, 1, 0));
      renderView([], days);
      expect(
        screen
          .getByTestId("week-hour-11")
          .classList.contains("text-destructive"),
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("槽位按钮 aria-label:createAt 插值『周三 14:30 新建条目』", () => {
    renderView([]);
    expect(
      screen.getByRole("button", { name: "周三 14:30 新建条目" }),
    ).toBeTruthy();
  });
});

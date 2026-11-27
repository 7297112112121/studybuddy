/**
 * UnscheduledPanel 组件测试。
 *
 * 覆盖:标题与空态、无时间条目全量渲染(周读域过滤派生在域 selector
 * selectWeekUnscheduled)、行首周几、新建回调、编辑回调带条目;删除确认层
 * 复用面已在 TodayPanel 测试覆盖,此处不重复。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import UnscheduledPanel from "@/features/calendar/components/UnscheduledPanel";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import type { CalendarEntryView } from "@/app/api/calendar/response";

const deleteEntryMock = vi.hoisted(() => vi.fn());
const resyncMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/api/calendar-sync", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: deleteEntryMock,
  resync: resyncMock,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function entry(
  id: string,
  date: string,
  title: string,
  startTime: string | null,
  endTime: string | null,
): CalendarEntryView {
  return { id, date, title, content: null, startTime, endTime };
}

function renderPanel(
  entries: CalendarEntryView[] = [],
  onEdit = vi.fn(),
  onCreate = vi.fn(),
  loadFailed = false,
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <UnscheduledPanel
        entries={entries}
        loadFailed={loadFailed}
        onCreate={onCreate}
        onEdit={onEdit}
      />
    </NextIntlClientProvider>,
  );
}

describe("UnscheduledPanel", () => {
  it("① 空态:标题「本周未安排时间事项」+「本周没有未安排时间的事项」", () => {
    renderPanel();
    expect(screen.getByText("本周未安排时间事项")).toBeTruthy();
    expect(screen.getByText("本周没有未安排时间的事项")).toBeTruthy();
  });

  it("② 列表渲染:无时间条目逐行在场,行首为周几(2026-11-16 为周一)", () => {
    renderPanel([entry("e1", "2026-11-16", "交英语作业", null, null)]);
    expect(screen.getByText("交英语作业")).toBeTruthy();
    expect(screen.getByText("一")).toBeTruthy();
  });

  it("③ 新建:点「新建」→ onCreate 被调", () => {
    const onCreate = vi.fn();
    renderPanel([], vi.fn(), onCreate);
    fireEvent.click(screen.getByRole("button", { name: "新建" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("④ 编辑:点「编辑」→ onEdit 以该条目被调", () => {
    const onEdit = vi.fn();
    renderPanel([entry("e1", "2026-11-16", "交英语作业", null, null)], onEdit);
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEdit.mock.calls[0][0].id).toBe("e1");
  });

  it("⑤ 读域失败:失败文案替代空态,不设重试钮(重试入口在周视图)", () => {
    renderPanel([], vi.fn(), vi.fn(), true);

    expect(screen.getByRole("alert").textContent).toContain("加载失败,请重试");
    expect(screen.queryByText("本周没有未安排时间的事项")).toBeNull();
    expect(screen.queryByRole("button", { name: "重试" })).toBeNull();
  });
});

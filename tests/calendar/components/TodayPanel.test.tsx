/**
 * TodayPanel 组件测试。
 *
 * 覆盖:标题逐字「11月17日 · 今天」、今日过滤(所在周其他日期条目不显示)、
 * 空态文案、编辑回调带条目、删除确认层无额外输入且取消/确认分支
 * (EntryRow 复用面,承接原 DayPanel 测试的删除确认覆盖)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import TodayPanel from "@/features/calendar/components/TodayPanel";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import type { CalendarEntryView } from "@/modules/calendar/queries";

const deleteEntryMock = vi.hoisted(() => vi.fn());
const resyncMock = vi.hoisted(() => vi.fn());

vi.mock("@/stores/calendar", () => ({
  useCalendarStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      deleteEntry: deleteEntryMock,
      resync: resyncMock,
    }),
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

const today = "2026-11-17";

function renderPanel(
  weekEntries: CalendarEntryView[] = [],
  onEdit = vi.fn(),
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <TodayPanel today={today} weekEntries={weekEntries} onEdit={onEdit} />
    </NextIntlClientProvider>,
  );
}

describe("TodayPanel", () => {
  it("① 空态:标题「11月17日 · 今天」+「这天还没有安排」", () => {
    renderPanel();
    expect(screen.getByText("11月17日 · 今天")).toBeTruthy();
    expect(screen.getByText("这天还没有安排")).toBeTruthy();
  });

  it("② 今日过滤:所在周其他日期条目不显示,仅今天条目在场", () => {
    renderPanel([
      entry("e1", "2026-11-16", "昨天的安排", "09:00", "10:00"),
      entry("e2", today, "高数复习", "14:00", "15:30"),
    ]);
    expect(screen.getByText("高数复习")).toBeTruthy();
    expect(screen.queryByText("昨天的安排")).toBeNull();
  });

  it("③ 编辑:点「编辑」→ onEdit 以今天条目被调", () => {
    const onEdit = vi.fn();
    renderPanel([entry("e2", today, "高数复习", "14:00", "15:30")], onEdit);
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEdit.mock.calls[0][0].id).toBe("e2");
  });

  it("④ 删除确认层:层内无输入控件;「取消」后条目仍在且 deleteEntry 未被调", async () => {
    renderPanel([entry("e1", today, "高数复习", "14:00", "15:30")]);

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.querySelectorAll("input")).toHaveLength(0); // D-08：确认层无额外输入
    expect(screen.getByText("确定删除这条安排吗？")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.getByText("高数复习")).toBeTruthy());
    expect(deleteEntryMock).not.toHaveBeenCalled();
  });

  it("⑤ 确认分支:删除确认后 deleteEntry 以 entry.id 被调", async () => {
    deleteEntryMock.mockResolvedValue({ ok: true });
    renderPanel([entry("e1", today, "高数复习", "14:00", "15:30")]);

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    // 确认按钮与行内「删除」触发器同名，取 dialog 内的
    fireEvent.click(
      [...dialog.querySelectorAll("button")].find(
        (b) => b.textContent === "删除",
      )!,
    );
    await waitFor(() => expect(deleteEntryMock).toHaveBeenCalledWith("e1"));
  });
});

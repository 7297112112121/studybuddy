/**
 * WeekEntryDialog 组件测试(AXY-23 tasks.md Task 7「失败测试」行)。
 *
 * 覆盖:create 预填(prefillStart→开始时间、prefillEnd→结束时间、日期锁定)、edit 预填
 * 原值、保存成功调编排并 onClose、删除 AlertDialog 二次确认(确认调
 * deleteEntryAction / 取消不调)。编排 mock 在 store 边界(单元测试纪律:
 * 分层 mock 边界,链经 useCalendarStore.getState 调编排);文案用真实 calendar.json。
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

import { API_ERROR } from "@/common/error";
import WeekEntryDialog from "@/features/calendar/components/WeekEntryDialog";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import type { WeekEntryDialogProps } from "@/features/calendar/components/WeekEntryDialog";

const createEntryActionMock = vi.hoisted(() => vi.fn());
const updateEntryActionMock = vi.hoisted(() => vi.fn());
const deleteEntryActionMock = vi.hoisted(() => vi.fn());
const resyncMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/stores/calendar", () => ({
  useCalendarStore: {
    getState: () => ({
      createEntry: createEntryActionMock,
      updateEntry: updateEntryActionMock,
      deleteEntry: deleteEntryActionMock,
      resync: resyncMock,
    }),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

const entry = {
  id: "e1",
  date: "2026-11-18",
  title: "组会",
  content: null,
  startTime: "14:30",
  endTime: null,
};

function renderDialog(props: Partial<WeekEntryDialogProps>) {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <WeekEntryDialog
        state={
          props.state ?? {
            mode: "create",
            date: "2026-11-18",
            prefillStart: "14:30",
            prefillEnd: "15:30",
          }
        }
        onClose={props.onClose ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("WeekEntryDialog(AXY-23 Task 7)", () => {
  it("create 模式:开始时间预填 prefillStart、结束时间预填 prefillEnd、日期锁定(日期控件不渲染)", () => {
    renderDialog({});

    expect((screen.getByLabelText("事项") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("开始时间") as HTMLInputElement).value).toBe(
      "14:30",
    );
    expect((screen.getByLabelText("结束时间") as HTMLInputElement).value).toBe(
      "15:30",
    );
    expect(screen.queryByLabelText("所属日期")).toBeNull();
  });

  it("edit 模式:预填原值", () => {
    renderDialog({ state: { mode: "edit", entry } });

    expect((screen.getByLabelText("事项") as HTMLInputElement).value).toBe(
      "组会",
    );
    expect((screen.getByLabelText("开始时间") as HTMLInputElement).value).toBe(
      "14:30",
    );
    expect((screen.getByLabelText("结束时间") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("create 保存成功 → createEntryAction 以锁定日期+预填开始时间被调,onClose 回调", async () => {
    createEntryActionMock.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.change(screen.getByLabelText("事项"), {
      target: { value: "组会" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加" }));

    await waitFor(() => expect(createEntryActionMock).toHaveBeenCalledOnce());
    expect(createEntryActionMock).toHaveBeenCalledWith({
      date: "2026-11-18",
      title: "组会",
      content: null,
      startTime: "14:30",
      endTime: "15:30",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("edit 模式删除 → AlertDialog 确认层出现,取消不调 deleteEntryAction", async () => {
    renderDialog({ state: { mode: "edit", entry } });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(await screen.findByText("确定删除这条安排吗？")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(deleteEntryActionMock).not.toHaveBeenCalled();
  });

  it("edit 模式确认删除 → deleteEntryAction 被调且 onClose 回调", async () => {
    deleteEntryActionMock.mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    renderDialog({ state: { mode: "edit", entry }, onClose });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() =>
      expect(deleteEntryActionMock).toHaveBeenCalledWith("e1"),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    void dialog;
  });

  it("edit 模式删除失败 → 弹窗保持在场呈现删除失败文案,onClose 不回调", async () => {
    deleteEntryActionMock.mockResolvedValue({
      ok: false,
      error: API_ERROR.SAVE_FAILED,
    });
    const onClose = vi.fn();
    renderDialog({ state: { mode: "edit", entry }, onClose });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    // 确认按钮与行内「删除」触发器同名,取 alertdialog 内的
    fireEvent.click(
      [...dialog.querySelectorAll("button")].find(
        (b) => b.textContent === "删除",
      )!,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "删除失败,请重试",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

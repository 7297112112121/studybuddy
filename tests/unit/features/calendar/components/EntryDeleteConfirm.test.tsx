/**
 * EntryDeleteConfirm 组件测试。
 *
 * 覆盖:确认层呈现(标题/条目标题/两动作钮)、删除接线与 isPending 禁用、
 * 取消接线(onOpenChange 收拢到 onCancel)、关闭态不渲染。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import EntryDeleteConfirm from "@/features/calendar/components/EntryDeleteConfirm";
import calendarMessages from "@/locales/zh-CN/calendar.json";

afterEach(cleanup);

function renderConfirm({
  open,
  title = "复习数学",
  isPending = false,
}: {
  open: boolean;
  title?: string;
  isPending?: boolean;
}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <EntryDeleteConfirm
        open={open}
        title={title}
        isPending={isPending}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </NextIntlClientProvider>,
  );
  return { onCancel, onConfirm };
}

describe("EntryDeleteConfirm", () => {
  it("open=true 呈现确认标题、条目标题与取消/删除两动作钮", () => {
    renderConfirm({ open: true, title: "复习英语" });
    expect(screen.getByText(calendarMessages.entry.confirmTitle)).toBeTruthy();
    expect(screen.getByText("复习英语")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: calendarMessages.entry.cancel }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: calendarMessages.entry.delete }),
    ).toBeTruthy();
  });

  it("点击删除 → onConfirm 调用;关闭路径 onCancel 恰一次(无显式 onClick 通道)", () => {
    const { onCancel, onConfirm } = renderConfirm({ open: true });
    fireEvent.click(
      screen.getByRole("button", { name: calendarMessages.entry.delete }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // AlertDialogAction 关闭确认层 → onOpenChange(false) → onCancel 一次;
    // 关闭接线缺失时此处为 0,收拢逻辑被短路改写时同样计数偏离。
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("点击取消 → onCancel 走双通道恰两次(显式 onClick + onOpenChange 收拢)", () => {
    const { onCancel, onConfirm } = renderConfirm({ open: true });
    fireEvent.click(
      screen.getByRole("button", { name: calendarMessages.entry.cancel }),
    );
    // AlertDialogCancel 显式 onClick 一次 + onOpenChange(false) 收拢一次。
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("isPending=true → 删除钮禁用,点击不触发 onConfirm", () => {
    const { onConfirm } = renderConfirm({ open: true, isPending: true });
    const deleteButton = screen.getByRole("button", {
      name: calendarMessages.entry.delete,
    });
    expect(deleteButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(deleteButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("open=false → 不渲染确认层", () => {
    renderConfirm({ open: false });
    expect(screen.queryByText(calendarMessages.entry.confirmTitle)).toBeNull();
    expect(
      screen.queryByRole("button", { name: calendarMessages.entry.delete }),
    ).toBeNull();
  });
});

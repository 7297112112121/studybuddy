/**
 * T7 red 阶段:EntryRow 发起入口与资料行渲染。
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import EntryRow from "@/modules/calendar/components/EntryRow";
import calendarMessages from "@/locales/zh-CN/calendar.json";
import type { CalendarEntryView } from "@/modules/calendar/queries";

vi.mock("@/modules/calendar/actions", () => ({
  deleteEntryAction: vi.fn(),
  requestProposalAction: vi.fn(),
  confirmProposalAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

const entry: CalendarEntryView = {
  id: "e1",
  date: "2026-11-20",
  title: "学习next框架",
  startTime: null,
  endTime: null,
};

function renderRow(
  props: {
    onAssist?: () => void;
    resources?: { title: string; url: string }[];
  } = {},
): void {
  render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <ul>
        <EntryRow
          entry={entry}
          onEdit={() => {}}
          onAssist={props.onAssist}
          resources={props.resources}
        />
      </ul>
    </NextIntlClientProvider>,
  );
}

describe("EntryRow(AXY-24 T7)", () => {
  it("传 onAssist 渲染「帮我找资料」且点击触发回调", () => {
    const onAssist = vi.fn();
    renderRow({ onAssist });
    fireEvent.click(screen.getByRole("button", { name: "帮我找资料" }));
    expect(onAssist).toHaveBeenCalledTimes(1);
  });

  it("不传 onAssist 不渲染发起按钮(AXY-22 行为不变)", () => {
    renderRow();
    expect(screen.queryByRole("button", { name: "帮我找资料" })).toBeNull();
    expect(screen.getByRole("button", { name: "编辑" })).toBeTruthy();
  });

  it("resources 渲染资料链接(target=_blank),无 resources 不渲染资料区", () => {
    renderRow({
      resources: [
        { title: "Next.js 官方文档", url: "https://nextjs.org/docs" },
      ],
    });
    const link = screen.getByRole("link", { name: "Next.js 官方文档" });
    expect(link.getAttribute("href")).toBe("https://nextjs.org/docs");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    cleanup();
    renderRow();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

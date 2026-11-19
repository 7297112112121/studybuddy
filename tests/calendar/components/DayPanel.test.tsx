/**
 * DayPanel/EntryRow 组件测试（AXY-22 Task 6，design「UI 与组件」节）。
 *
 * 覆盖 tasks.md Task 6「失败测试」行：空态文案、标题（今天/非今天）、
 * 行文案形态（时间段/无时间）、删除确认层无额外输入且取消分支不调 action、
 * 确认分支调 deleteEntryAction。文案以真实 calendar.json 渲染。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import DayPanel from "@/modules/calendar/components/DayPanel";
import calendarMessages from "@/locales/zh-CN/calendar.json";

const deleteEntryActionMock = vi.hoisted(() => vi.fn());
const requestProposalMock = vi.hoisted(() => vi.fn());
const confirmProposalMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/modules/calendar/actions", () => ({
  deleteEntryAction: deleteEntryActionMock,
  requestProposalAction: requestProposalMock,
  confirmProposalAction: confirmProposalMock,
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPanel(
  props: Partial<React.ComponentProps<typeof DayPanel>> = {},
) {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ calendar: calendarMessages }}>
      <DayPanel
        date={props.date ?? "2026-11-17"}
        entries={props.entries ?? []}
        today={props.today ?? "2026-11-17"}
        resources={props.resources}
      />
    </NextIntlClientProvider>,
  );
}

describe("DayPanel（tests/calendar/components/DayPanel）", () => {
  it("① 空态：entries=[] → 渲染「这天还没有安排」", () => {
    renderPanel();
    expect(screen.getByText("这天还没有安排")).toBeTruthy();
  });

  it("② 标题：date===today → 「11月17日 · 今天」，否则「11月16日」", () => {
    const { unmount } = renderPanel();
    expect(screen.getByText("11月17日 · 今天")).toBeTruthy();
    unmount();

    renderPanel({ date: "2026-11-16" });
    expect(screen.getByText("11月16日")).toBeTruthy();
    expect(screen.queryByText("11月16日 · 今天")).toBeNull();
  });

  it("③ 行文案：带时间条目渲染「14:00–15:30」+「高数复习」，无时间仅 title", () => {
    renderPanel({
      entries: [
        { id: "e1", date: "2026-11-17", title: "高数复习", startTime: "14:00", endTime: "15:30" },
        { id: "e2", date: "2026-11-17", title: "交英语作业", startTime: null, endTime: null },
      ],
    });
    expect(screen.getByText("14:00–15:30")).toBeTruthy();
    expect(screen.getByText("高数复习")).toBeTruthy();
    expect(screen.getByText("交英语作业")).toBeTruthy();
    expect(screen.queryByText(/:00:00/)).toBeNull(); // 秒位不泄漏（Review Focus #2）
  });

  it("④ 删除确认层：层内无输入控件；「取消」后条目仍在且 deleteEntryAction 未被调", async () => {
    renderPanel({
      entries: [
        { id: "e1", date: "2026-11-17", title: "高数复习", startTime: "14:00", endTime: "15:30" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.querySelectorAll("input")).toHaveLength(0); // D-08：确认层无额外输入
    expect(screen.getByText("确定删除这条安排吗？")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.getByText("高数复习")).toBeTruthy());
    expect(deleteEntryActionMock).not.toHaveBeenCalled();
  });

  it("⑤ 确认分支：删除确认后 deleteEntryAction 以 entry.id 被调", async () => {
    deleteEntryActionMock.mockResolvedValue({ ok: true });
    renderPanel({
      entries: [
        { id: "e1", date: "2026-11-17", title: "高数复习", startTime: "14:00", endTime: "15:30" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = await screen.findByRole("alertdialog");
    // 确认按钮与行内「删除」触发器同名，取 dialog 内的
    fireEvent.click(
      [...dialog.querySelectorAll("button")].find((b) => b.textContent === "删除")!,
    );
    await waitFor(() =>
      expect(deleteEntryActionMock).toHaveBeenCalledWith("e1"),
    );
  });

  it("⑥ 编辑切换：新建模式先挂载后点「编辑」→ 表单预填被编辑条目（useState 初始化器须重跑）", async () => {
    renderPanel({
      entries: [
        { id: "e1", date: "2026-11-16", title: "旧标题", startTime: "10:00", endTime: "11:00" },
      ],
    });
    // 新建模式先在场（空表单）
    expect((screen.getByLabelText("事项") as HTMLInputElement).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    const title = screen.getByLabelText("事项") as HTMLInputElement;
    await waitFor(() => expect(title.value).toBe("旧标题"));
    expect((screen.getByLabelText("开始时间") as HTMLInputElement).value).toBe("10:00");
    expect((screen.getByLabelText("所属日期") as HTMLInputElement).value).toBe("2026-11-16");
  });
});

describe("DayPanel 资料展示与发起入口(AXY-24 T7)", () => {
  const baseEntries = [
    { id: "e9", date: "2026-11-17", title: "学习next框架", startTime: null, endTime: null },
  ];

  it("资源经 props 合并渲染资料链接(target=_blank)", () => {
    renderPanel({
      entries: baseEntries,
      resources: new Map([
        ["e9", [{ title: "Next.js 官方文档", url: "https://nextjs.org/docs" }]],
      ]),
    });
    const link = screen.getByRole("link", { name: "Next.js 官方文档" });
    expect(link.getAttribute("href")).toBe("https://nextjs.org/docs");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("点条目「帮我找资料」挂载 ProposalDialog 并以条目 id 发起", async () => {
    requestProposalMock.mockResolvedValue({
      ok: true,
      proposal: { kind: "NEEDS_RANGE" },
    });
    renderPanel({ entries: baseEntries });
    fireEvent.click(screen.getByRole("button", { name: "帮我找资料" }));
    expect(await screen.findByText("AI 资料提案")).toBeTruthy();
    expect(requestProposalMock).toHaveBeenCalledWith("e9", null);
  });
});

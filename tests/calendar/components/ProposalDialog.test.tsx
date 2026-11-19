/**
 * T6 red 阶段:ProposalDialog 浮层状态机与交互。
 * mock 两 action 与 next/navigation;真实 zh-CN messages(沿 DayPanel.test 模式,fireEvent)。
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import calendarMessages from "@/locales/zh-CN/calendar.json";

const requestMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: vi.fn() }),
}));
vi.mock("@/modules/calendar/actions", () => ({
  requestProposalAction: requestMock,
  confirmProposalAction: confirmMock,
}));

import ProposalDialog from "@/modules/calendar/components/ProposalDialog";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const PLAN = {
  ok: true as const,
  proposal: {
    kind: "PLAN" as const,
    days: [
      {
        date: "2026-11-20",
        text: "阅读官方文档",
        resources: [{ title: "Next.js 官方文档", url: "https://nextjs.org/docs" }],
      },
      {
        date: "2026-11-21",
        text: "跟学课程",
        resources: [{ title: "Learn", url: "https://nextjs.org/learn" }],
      },
    ],
  },
};

function renderDialog(
  props: { onClose?: () => void } = {},
): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={{ calendar: calendarMessages }}>
      <ProposalDialog
        entryId="entry-1"
        entryTitle="学习next框架"
        onClose={props.onClose ?? (() => {})}
      />
    </NextIntlClientProvider>,
  );
}

function planAction(result: unknown = PLAN): void {
  requestMock.mockResolvedValue(result);
}

function change(input: HTMLElement, value: string): void {
  fireEvent.change(input, { target: { value } });
}

/** 清单文字渲染在 Input value 里,断言走输入值而非文本节点。 */
async function expectDayText(text: string, index = 0): Promise<void> {
  await waitFor(() => {
    const inputs = screen.getAllByLabelText("安排") as HTMLInputElement[];
    expect(inputs[index].value).toBe(text);
  });
}

describe("ProposalDialog 状态机", () => {
  it("挂载即发起:先呈现生成中文案,成功后呈现按天清单", async () => {
    let resolve!: (v: unknown) => void;
    requestMock.mockImplementationOnce(
      () => new Promise((r) => (resolve = r)),
    );
    renderDialog();
    expect(await screen.findByText("正在生成提案…"));
    resolve(PLAN);
    await expectDayText("阅读官方文档");
    expect(requestMock).toHaveBeenCalledWith("entry-1", null);
  });

  it("PLAN 清单渲染资料链接(target=_blank)与确认/关闭/重新生成动作", async () => {
    planAction();
    renderDialog();
    const link = await screen.findByRole("link", { name: "Next.js 官方文档" });
    expect(link.getAttribute("href")).toBe("https://nextjs.org/docs");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("button", { name: "确认写入" }));
    expect(screen.getByRole("button", { name: "关闭" }));
    expect(screen.getByRole("button", { name: "重新生成" }));
  });

  it("NEEDS_RANGE → 追问视图;INCOMPREHENSIBLE → E-06 在输入框下方", async () => {
    requestMock
      .mockResolvedValueOnce({ ok: true, proposal: { kind: "NEEDS_RANGE" } })
      .mockResolvedValueOnce({
        ok: true,
        proposal: { kind: "NEEDS_RANGE_INCOMPREHENSIBLE" },
      });
    renderDialog();
    expect(await screen.findByText("打算学到哪天?"));

    const input = screen.getByLabelText("打算学到哪天?");
    expect((input as HTMLInputElement).getAttribute("maxLength")).toBe("200");
    change(input, "随便");
    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    expect(
      await screen.findByText(
        "没看懂这个时间,把它写成起止日期(如 11.20–11.30)再试试",
      ),
    );
    // 答复随重试进入第二次请求
    expect(requestMock).toHaveBeenLastCalledWith("entry-1", "随便");
  });

  it("F-01 留空提交被拦,呈现 E-01 于输入框下方,不发请求", async () => {
    requestMock.mockResolvedValueOnce({ ok: true, proposal: { kind: "NEEDS_RANGE" } });
    renderDialog();
    await screen.findByText("打算学到哪天?");

    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    expect(await screen.findByText("请输入你打算的时间,或取消"));
    expect(requestMock).toHaveBeenCalledTimes(1); // 仅挂载那次
  });

  it("服务端 INVALID_INPUT(answer)→ E-01 呈现输入框下方", async () => {
    requestMock
      .mockResolvedValueOnce({ ok: true, proposal: { kind: "NEEDS_RANGE" } })
      .mockResolvedValueOnce({
        ok: false,
        error: "INVALID_INPUT",
        fieldErrors: { answer: "calendar.proposal.answerRequired" },
      });
    renderDialog();
    await screen.findByText("打算学到哪天?");

    change(screen.getByLabelText("打算学到哪天?"), "abc");
    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    expect(await screen.findByText("请输入你打算的时间,或取消"));
  });

  it("NOT_APPLICABLE / NOT_FOUND(含理由)/ UNAVAILABLE+重试 各态渲染", async () => {
    requestMock
      .mockResolvedValueOnce({
        ok: true,
        proposal: { kind: "NOT_APPLICABLE", reason: "日常购物事项" },
      })
      .mockResolvedValueOnce({
        ok: true,
        proposal: { kind: "NOT_FOUND", reason: "该主题缺少系统公开教程" },
      })
      .mockResolvedValueOnce({ ok: false, error: "AI_UNAVAILABLE" });

    renderDialog();
    expect(await screen.findByText("这条日程不需要找资料"));

    // 重新生成走第二种结果
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    expect(
      await screen.findByText("没找到合适的资料:该主题缺少系统公开教程"),
    );

    // 再走第三种
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    expect(
      await screen.findByText("AI 服务暂时不可用,请稍后重试"),
    );
    expect(screen.getByRole("button", { name: "重试" }));
  });

  it("重试即重新发起(R8):恢复后回到清单", async () => {
    requestMock
      .mockResolvedValueOnce({ ok: false, error: "AI_UNAVAILABLE" })
      .mockResolvedValueOnce(PLAN);
    renderDialog();
    await screen.findByText("AI 服务暂时不可用,请稍后重试");

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await expectDayText("阅读官方文档");
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("行内删改与整条删除;全部删光后确认=放弃不发确认请求", async () => {
    planAction();
    renderDialog();
    await expectDayText("阅读官方文档");

    change(screen.getAllByLabelText("安排")[0], "改过的安排");
    expect((screen.getAllByLabelText("安排")[0] as HTMLInputElement).value).toBe(
      "改过的安排",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]);
    expect(screen.getAllByLabelText("安排")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "删除" })[0]);
    expect(screen.queryByLabelText("安排")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "确认写入" }));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("确认写入:载荷含删改结果,成功后 onClose", async () => {
    const onClose = vi.fn();
    planAction();
    confirmMock.mockResolvedValue({ ok: true });
    renderDialog({ onClose });
    await expectDayText("阅读官方文档");

    change(screen.getAllByLabelText("安排")[0], "改过的安排");
    fireEvent.click(screen.getByRole("button", { name: "确认写入" }));

    expect(confirmMock).toHaveBeenCalledWith({
      entryId: "entry-1",
      days: [
        {
          date: "2026-11-20",
          text: "改过的安排",
          resources: [
            { title: "Next.js 官方文档", url: "https://nextjs.org/docs" },
          ],
        },
        {
          date: "2026-11-21",
          text: "跟学课程",
          resources: [{ title: "Learn", url: "https://nextjs.org/learn" }],
        },
      ],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("WRITE_FAILED → E-05 且清单保留可重试(确认按钮恢复)", async () => {
    confirmMock.mockResolvedValueOnce({ ok: false, error: "WRITE_FAILED" });
    planAction();
    renderDialog();
    await expectDayText("阅读官方文档");

    fireEvent.click(screen.getByRole("button", { name: "确认写入" }));
    expect(
      await screen.findByText("写入日程失败,你的日程未改动,请重试"),
    );
    // 清单仍在,确认按钮恢复可用(提案保留可重试)
    expect((screen.getByRole("button", { name: "确认写入" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getAllByLabelText("安排")[0] as HTMLInputElement).value).toBe("阅读官方文档");
  });

  it("确认写入中置灰不可重复提交", async () => {
    confirmMock.mockImplementationOnce(() => new Promise(() => undefined));
    planAction();
    renderDialog();
    // (planAction 已置于上方)
    await expectDayText("阅读官方文档");

    fireEvent.click(screen.getByRole("button", { name: "确认写入" }));
    const writingButton = (await screen.findByRole("button", {
      name: "确认写入",
    })) as HTMLButtonElement;
    expect(writingButton.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "重新生成" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("关闭按钮 → onClose(本地态丢弃)", async () => {
    const onClose = vi.fn();
    planAction();
    renderDialog({ onClose });
    await expectDayText("阅读官方文档");

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("UNAUTHORIZED → 跳转 /login", async () => {
    requestMock.mockResolvedValueOnce({ ok: false, error: "UNAUTHORIZED" });
    renderDialog();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("重新生成(R9):以新响应整体替换清单", async () => {
    requestMock
      .mockResolvedValueOnce(PLAN)
      .mockResolvedValueOnce({
        ok: true,
        proposal: {
          kind: "PLAN",
          days: [
            {
              date: "2026-11-25",
              text: "新提案的一天",
              resources: [{ title: "New", url: "https://nextjs.org/docs" }],
            },
          ],
        },
      });
    renderDialog();
    await expectDayText("阅读官方文档");

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await expectDayText("新提案的一天");
    expect((screen.getAllByLabelText("安排") as HTMLInputElement[]).some((i) => i.value === "阅读官方文档")).toBe(false);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});

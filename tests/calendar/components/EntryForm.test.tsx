/**
 * EntryForm 组件测试（AXY-22 Task 5，design「UI 与组件」节）。
 *
 * 覆盖 tasks.md Task 5「失败测试」行：E-01/E-03 即地呈现且不调 action、
 * 开始留空结束禁用、不带时间提交形态、编辑预填、isPending 防重复、
 * SAVE_FAILED/UNAUTHORIZED/NOT_FOUND 分流、成功复位 + onSaved。
 * action 经 vi.mock 桩接（组件边界，不触 DB）；文案以真实 calendar.json
 * 经 NextIntlClientProvider 渲染。
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
import EntryForm from "@/modules/calendar/components/EntryForm";
import calendarMessages from "@/locales/zh-CN/calendar.json";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));
const { createEntryActionMock, updateEntryActionMock } = vi.hoisted(() => ({
  createEntryActionMock: vi.fn(),
  updateEntryActionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));
vi.mock("@/modules/calendar/actions", () => ({
  createEntryAction: createEntryActionMock,
  updateEntryAction: updateEntryActionMock,
  deleteEntryAction: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderForm(
  props: Partial<React.ComponentProps<typeof EntryForm>> = {},
) {
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={{ calendar: calendarMessages }}
    >
      <EntryForm date={props.date ?? "2026-11-17"} {...props} />
    </NextIntlClientProvider>,
  );
}

function fillTitle(value: string): void {
  fireEvent.change(screen.getByLabelText("事项"), { target: { value } });
}
function fillStart(value: string): void {
  fireEvent.change(screen.getByLabelText("开始时间"), { target: { value } });
}
function fillEnd(value: string): void {
  fireEvent.change(screen.getByLabelText("结束时间"), { target: { value } });
}
function submit(): void {
  fireEvent.click(screen.getByRole("button", { name: "添加" }));
}

describe("EntryForm（tests/calendar/components/EntryForm）", () => {
  it("① 事项留空提交 → E-01 渲染于字段下方且 createEntryAction 未被调", async () => {
    renderForm();
    submit();

    expect(await screen.findByText("请填写事项内容")).toBeTruthy();
    expect(createEntryActionMock).not.toHaveBeenCalled();
  });

  it("② 开始 14:00 + 结束 14:00 → E-03 渲染于结束字段下方且不提交", async () => {
    renderForm();
    fillTitle("高数复习");
    fillStart("14:00");
    fillEnd("14:00");
    submit();

    expect(await screen.findByText("结束时间需晚于开始时间")).toBeTruthy();
    expect(createEntryActionMock).not.toHaveBeenCalled();
  });

  it("③ 开始留空 → 结束控件 disabled；填开始 → 恢复可输", () => {
    renderForm();
    const end = screen.getByLabelText("结束时间") as HTMLInputElement;
    expect(end.disabled).toBe(true);

    fillStart("14:00");
    expect(end.disabled).toBe(false);
  });

  it("④ 开始 14:00 结束空提交 → action 以时间点形态被调（endTime null）", async () => {
    createEntryActionMock.mockResolvedValue({ ok: true });
    renderForm();
    fillTitle("晨读");
    fillStart("14:00");
    submit();

    await waitFor(() => expect(createEntryActionMock).toHaveBeenCalledOnce());
    expect(createEntryActionMock).toHaveBeenCalledWith({
      date: "2026-11-17",
      title: "晨读",
      startTime: "14:00",
      endTime: null,
    });
  });

  it("④' 仅填文本提交 → action 以双 null 时间形态被调", async () => {
    createEntryActionMock.mockResolvedValue({ ok: true });
    renderForm();
    fillTitle("交英语作业");
    submit();

    await waitFor(() => expect(createEntryActionMock).toHaveBeenCalledOnce());
    expect(createEntryActionMock).toHaveBeenCalledWith({
      date: "2026-11-17",
      title: "交英语作业",
      startTime: null,
      endTime: null,
    });
  });

  it("⑤ 编辑模式：entry 预填（含所属日期控件），提交调 updateEntryAction", async () => {
    updateEntryActionMock.mockResolvedValue({ ok: true });
    renderForm({
      entry: {
        id: "e1",
        date: "2026-11-16",
        title: "旧标题",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    const title = screen.getByLabelText("事项") as HTMLInputElement;
    const dateInput = screen.getByLabelText("所属日期") as HTMLInputElement;
    expect(title.value).toBe("旧标题");
    expect(dateInput.value).toBe("2026-11-16");
    expect((screen.getByLabelText("开始时间") as HTMLInputElement).value).toBe(
      "10:00",
    );

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(updateEntryActionMock).toHaveBeenCalledOnce());
    expect(updateEntryActionMock).toHaveBeenCalledWith("e1", {
      date: "2026-11-16",
      title: "旧标题",
      startTime: "10:00",
      endTime: "11:00",
    });
  });

  it("⑥ isPending：action 挂起期间按钮 disabled，二次点击不重复调用", async () => {
    createEntryActionMock.mockReturnValue(new Promise(() => {})); // 永挂起
    renderForm();
    fillTitle("高数复习");
    submit();
    const button = screen.getByRole("button", {
      name: "添加",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    submit(); // 提交中重复点击
    expect(createEntryActionMock).toHaveBeenCalledOnce();
  });

  it("⑦ SAVE_FAILED → 表单提示区「保存失败,请重试」且不抛", async () => {
    createEntryActionMock.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    renderForm();
    fillTitle("高数复习");
    submit();

    expect(await screen.findByText("保存失败,请重试")).toBeTruthy();
  });

  it("⑦' action 传输层异常（网络失败 reject）→ E-02 呈现且不抛", async () => {
    createEntryActionMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderForm();
    fillTitle("高数复习");
    submit();

    expect(await screen.findByText("保存失败,请重试")).toBeTruthy();
  });

  it("⑧ UNAUTHORIZED → router.replace('/login')", async () => {
    createEntryActionMock.mockResolvedValue({
      ok: false,
      error: "UNAUTHORIZED",
    });
    renderForm();
    fillTitle("高数复习");
    submit();

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login"),
    );
  });

  it("⑨ NOT_FOUND → router.refresh() 静默刷新", async () => {
    createEntryActionMock.mockResolvedValue({ ok: false, error: "NOT_FOUND" });
    renderForm();
    fillTitle("高数复习");
    submit();

    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledOnce());
  });

  it("⑩ 成功 → onSaved 回调一次且表单复位", async () => {
    createEntryActionMock.mockResolvedValue({ ok: true });
    const onSaved = vi.fn();
    renderForm({ onSaved });
    fillTitle("高数复习");
    fillStart("14:00");
    fillEnd("15:30");
    submit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const title = screen.getByLabelText("事项") as HTMLInputElement;
    expect(title.value).toBe("");
  });

  it("⑪ 校验失败修正后错误即时消除（重跑 safeParse）", async () => {
    renderForm();
    fillStart("14:00");
    fillEnd("14:00");
    fillTitle("高数复习");
    submit();
    expect(await screen.findByText("结束时间需晚于开始时间")).toBeTruthy();

    fillEnd("15:30");
    expect(screen.queryByText("结束时间需晚于开始时间")).toBeNull();
  });
});

// —— Task 6:showDateField(AXY-23 tasks.md Task 6「失败测试」行) ——

describe("EntryForm showDateField(AXY-23)", () => {
  const editEntry = {
    id: "e1",
    date: "2026-11-16",
    title: "旧标题",
    startTime: "10:00",
    endTime: "11:00",
  };

  it("showDateField=false 编辑模式:不渲染所属日期控件,提交日期锁定 entry.date", async () => {
    updateEntryActionMock.mockResolvedValue({ ok: true });
    renderForm({ entry: editEntry, showDateField: false });

    expect(screen.queryByLabelText("所属日期")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(updateEntryActionMock).toHaveBeenCalledOnce());
    expect(updateEntryActionMock).toHaveBeenCalledWith("e1", {
      date: "2026-11-16",
      title: "旧标题",
      startTime: "10:00",
      endTime: "11:00",
    });
  });

  it("默认(不传 showDateField)编辑模式:所属日期控件在场(现状不变)", () => {
    renderForm({ entry: editEntry });
    expect(screen.getByLabelText("所属日期")).toBeTruthy();
  });
});

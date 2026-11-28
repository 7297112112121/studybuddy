/**
 * 日历 store 写路径编排单测(src/stores/calendar.ts createEntry/updateEntry/
 * deleteEntry):成功即写后失效——导航读域与今日读域并行重取(各有锚点才取);
 * 失败原样透传结果、不触发刷新。请求层经 vi.mock("@/api/calendar") 桩接
 * (相邻下一层),与读路径 calendar.test.ts 的 fetch 桩分文件。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEntryInput } from "@/app/api/calendar/request";
import {
  createCalendarEntry,
  deleteCalendarEntry,
  fetchCalendarEntries,
  updateCalendarEntry,
} from "@/api/calendar";
import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/app/api/calendar/response";
import { useCalendarStore } from "@/stores/calendar";

vi.mock("@/api/calendar", () => ({
  fetchCalendarEntries: vi.fn(),
  createCalendarEntry: vi.fn(),
  updateCalendarEntry: vi.fn(),
  deleteCalendarEntry: vi.fn(),
}));

const fetchMock = vi.mocked(fetchCalendarEntries);
const createMock = vi.mocked(createCalendarEntry);
const updateMock = vi.mocked(updateCalendarEntry);
const deleteMock = vi.mocked(deleteCalendarEntry);

const input: CalendarEntryInput = {
  date: "2026-11-17",
  title: "周会",
  content: null,
  startTime: "14:00",
  endTime: "15:00",
};

function entry(id: string): CalendarEntryView {
  return {
    id,
    date: "2026-11-17",
    title: `事项${id}`,
    content: null,
    startTime: "14:00",
    endTime: null,
  };
}

function okVoid(): ApiResult {
  return { ok: true, data: undefined };
}

function okRows(data: CalendarEntryView[]): ApiResult<CalendarEntryView[]> {
  return { ok: true, data };
}

/** 编排 action 为稳定引用,模块级解构一次。 */
const {
  createEntry,
  updateEntry,
  deleteEntry,
  applyNavigationLoad,
  applyTodayLoad,
} = useCalendarStore.getState();

beforeEach(() => {
  useCalendarStore.setState({
    entries: [],
    todayEntries: [],
    todayScope: null,
    loadError: false,
    scope: null,
  });
  fetchMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("写后失效编排:成功即并行重取两读域", () => {
  it("createEntry 成功 → 按两读域锚点各取一次,读域状态更新", async () => {
    applyNavigationLoad("2026-11-16");
    applyTodayLoad("2026-11-16");
    createMock.mockResolvedValue(okVoid());
    fetchMock.mockResolvedValue(okRows([entry("e1")]));

    const result = await createEntry(input);

    expect(result).toEqual(okVoid());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "2026-11-16",
      "2026-11-16",
    ]);
    expect(useCalendarStore.getState().entries).toEqual([entry("e1")]);
    expect(useCalendarStore.getState().todayEntries).toEqual([entry("e1")]);
  });

  it("仅今日读域有锚点 → 恰取一次(导航域 null 臂不取)", async () => {
    applyTodayLoad("2026-11-16");
    createMock.mockResolvedValue(okVoid());
    fetchMock.mockResolvedValue(okRows([]));

    await createEntry(input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("2026-11-16");
  });

  it("两读域均无锚点(初始态)→ 写后不触发重取", async () => {
    createMock.mockResolvedValue(okVoid());

    await createEntry(input);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("写路径失败归一:原样透传结果,不触发刷新", () => {
  it("createEntry 失败(SAVE_FAILED)→ 返回原结果引用且不触发重取", async () => {
    const failure: ApiResult = { ok: false, error: API_ERROR.SAVE_FAILED };
    createMock.mockResolvedValue(failure);

    const result = await createEntry(input);

    expect(result).toBe(failure);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updateEntry 失败(SAVE_FAILED)→ 返回原结果引用且不触发重取", async () => {
    const failure: ApiResult = { ok: false, error: API_ERROR.SAVE_FAILED };
    updateMock.mockResolvedValue(failure);

    const result = await updateEntry("entry-1", input);

    expect(result).toBe(failure);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deleteEntry 失败(SAVE_FAILED)→ 返回原结果引用且不触发重取", async () => {
    const failure: ApiResult = { ok: false, error: API_ERROR.SAVE_FAILED };
    deleteMock.mockResolvedValue(failure);

    const result = await deleteEntry("entry-1");

    expect(result).toBe(failure);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

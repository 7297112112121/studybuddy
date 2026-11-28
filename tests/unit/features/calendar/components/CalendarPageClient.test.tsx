/**
 * 日历页组合层测试(src/features/calendar/components/CalendarPageClient.tsx):
 * 读域契约失败分派(retry 链)——load 返回 null(过期丢弃)或成功契约不
 * 派发失败,失败契约派发 handleApiFailure。store 兼用选择器订阅与
 * getState,桩形状为 Object.assign(vi.fn(sel=>sel(state)),{getState});
 * 组合层子件桩接(相邻层),仅证组合行为。新建卡落点(L169)双臂依赖真实
 * 时钟,按纪律「禁 mock 时钟」留白。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { API_ERROR } from "@/common/error";
import CalendarPageClient from "@/features/calendar/components/CalendarPageClient";
import calendarMessages from "@/locales/zh-CN/calendar.json";

const storeState = vi.hoisted(() => ({
  entries: [] as unknown[],
  todayEntries: [] as unknown[],
  loadError: false,
}));
const loadMock = vi.hoisted(() => vi.fn());
const loadTodayMock = vi.hoisted(() => vi.fn());
const handleApiFailure = vi.hoisted(() => {
  const fn = vi.fn();
  fn.mockResolvedValue(undefined);
  return fn;
});

vi.mock("@/stores/calendar", () => ({
  useCalendarStore: Object.assign(
    vi.fn((sel: (s: typeof storeState) => unknown) => sel(storeState)),
    {
      getState: () => ({ load: loadMock, loadToday: loadTodayMock }),
    },
  ),
}));
vi.mock("@/api/contract", () => ({
  useApiFailureHandler: () => handleApiFailure,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
// 组合层子件桩接(相邻层):本文件只证组合行为,子件内部各有自己的测试
vi.mock("@/features/calendar/components/WeekView", () => ({
  default: () => null,
}));
vi.mock("@/features/calendar/components/MiniMonthCard", () => ({
  default: () => null,
}));
vi.mock("@/features/calendar/components/TodayPanel", () => ({
  default: () => null,
}));
vi.mock("@/features/calendar/components/UnscheduledPanel", () => ({
  default: () => null,
}));
vi.mock("@/features/calendar/components/WeekEntryDialog", () => ({
  default: () => null,
}));

beforeEach(() => {
  storeState.entries = [];
  storeState.todayEntries = [];
  storeState.loadError = false;
  loadMock.mockReset();
  loadTodayMock.mockReset();
  loadTodayMock.mockResolvedValue(undefined);
  handleApiFailure.mockClear();
});

afterEach(cleanup);

describe("读域契约失败分派(retry 链)", () => {
  function renderPage() {
    return render(
      <NextIntlClientProvider
        locale="zh-CN"
        messages={{ calendar: calendarMessages }}
      >
        <CalendarPageClient params={{}} />
      </NextIntlClientProvider>,
    );
  }

  it("load 返回 null(过期丢弃)→ 不派发失败", async () => {
    loadMock.mockResolvedValue(null);

    renderPage();
    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));

    expect(handleApiFailure).not.toHaveBeenCalled();
  });

  it("load 返回成功契约 → 不派发失败", async () => {
    loadMock.mockResolvedValue({ ok: true, data: [] });

    renderPage();
    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));

    expect(handleApiFailure).not.toHaveBeenCalled();
  });

  it("load 返回失败契约 → 以原契约结果派发 handleApiFailure", async () => {
    const failure = { ok: false, error: API_ERROR.LOAD_FAILED };
    loadMock.mockResolvedValue(failure);

    renderPage();

    await waitFor(() => expect(handleApiFailure).toHaveBeenCalledTimes(1));
    expect(handleApiFailure.mock.calls[0][0]).toEqual(failure);
  });
});

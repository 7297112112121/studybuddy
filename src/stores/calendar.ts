/**
 * 文件作用:日历业务数据客户端持有层
 */
import { create } from "zustand";

import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import {
  formatYearMonth,
  type CalendarEntryInput,
} from "@/validation/calendar-validators";

/** 读域:当前加载的条目范围(周锚点或年月),写成功后按此重取失效。 */
export type CalendarScope =
  | { view: "week"; weekStart: string }
  | { view: "month"; year: number; month: number };

/** 读失败归一:未授权(UNAUTHORIZED)或技术异常(NETWORK,含读兜底码);两值同呈现失败态,仅作来源判别。 */
export type CalendarLoadError = "UNAUTHORIZED" | "NETWORK";

type CalendarState = {
  entries: CalendarEntryView[];
  /** 今日读域:今天所在周条目,独立于导航读域(今日日程常驻的数据源)。 */
  todayEntries: CalendarEntryView[];
  /** 今日读域锚点(周一):loadToday 记录,写后失效据此重取。 */
  todayScope: string | null;
  /** 导航读域失败态:失败呈现与重试的依据。 */
  loadError: CalendarLoadError | null;
  scope: CalendarScope | null;
  /** 加载导航读域条目(周/月),替换既有 entries。 */
  load: (scope: CalendarScope) => Promise<void>;
  /** 加载今日读域条目(今天所在周,weekStart 由调用方锚定),替换 todayEntries。 */
  loadToday: (weekStart: string) => Promise<void>;
  /** 写路径:统一走契约结果(ApiResult)返回(fieldErrors 供表单定位)。 */
  createEntry: (input: CalendarEntryInput) => Promise<ApiResult>;
  updateEntry: (
    entryId: string,
    input: CalendarEntryInput,
  ) => Promise<ApiResult>;
  deleteEntry: (entryId: string) => Promise<ApiResult>;
  /** 按当前读域重取(写后失效编排之外的显式重同步,如失败重试与未找到(NOT_FOUND)静默刷新)。 */
  resync: () => Promise<void>;
};

function scopeQuery(scope: CalendarScope): string {
  if (scope.view === "week") {
    return `week=${encodeURIComponent(scope.weekStart)}`;
  }
  return `view=month&month=${formatYearMonth(scope.year, scope.month)}`;
}

/** 写端点调用归一:body 即契约结果(ApiResult),网络异常不由本层吞。 */
async function requestWrite(
  url: string,
  init: RequestInit,
): Promise<ApiResult> {
  const response = await fetch(url, init);
  return (await response.json()) as ApiResult;
}

/** 写后失效编排:导航读域与今日读域并行重取(各自有锚点才取)。
    导航域即今天所在周时两读域同 URL,双请求为读域单一形状的代价。 */
function refreshAfterWrite(get: () => CalendarState): Promise<unknown> {
  const { scope, todayScope, load, loadToday } = get();
  return Promise.all([
    scope ? load(scope) : Promise.resolve(),
    todayScope !== null ? loadToday(todayScope) : Promise.resolve(),
  ]);
}

/** 读域竞态守卫:单调序号,响应落库前校验仍为最新发起,过期响应整体丢弃
    (快速翻周/翻月时前序响应后到不得覆盖新读域)。两读域独立计数。 */
let navigationLoadSeq = 0;
let todayLoadSeq = 0;

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  entries: [],
  todayEntries: [],
  todayScope: null,
  loadError: null,
  scope: null,

  load: async (scope) => {
    const seq = ++navigationLoadSeq;
    set({ scope, loadError: null });
    try {
      const response = await fetch(
        `/api/calendar/entries?${scopeQuery(scope)}`,
      );
      const data = (await response.json()) as ApiResult<CalendarEntryView[]>;
      if (seq !== navigationLoadSeq) return;
      if (data.ok) {
        set({ entries: data.data });
      } else {
        set({
          entries: [],
          loadError:
            data.error === API_ERROR.UNAUTHORIZED ? "UNAUTHORIZED" : "NETWORK",
        });
      }
    } catch (error) {
      if (seq !== navigationLoadSeq) return;
      console.error(error);
      set({ entries: [], loadError: "NETWORK" });
    }
  },

  /** 加载今日读域(今天所在周),替换 todayEntries。失败静默空:鉴权/网络
      异常由导航读域同一通道呈报,今日面板不为次要读域另设错误态。 */
  loadToday: async (weekStart) => {
    const seq = ++todayLoadSeq;
    set({ todayScope: weekStart });
    try {
      const response = await fetch(
        `/api/calendar/entries?week=${encodeURIComponent(weekStart)}`,
      );
      const data = (await response.json()) as ApiResult<CalendarEntryView[]>;
      if (seq !== todayLoadSeq) return;
      set({ todayEntries: data.ok ? data.data : [] });
    } catch (error) {
      if (seq !== todayLoadSeq) return;
      console.error(error);
      set({ todayEntries: [] });
    }
  },

  createEntry: async (input) => {
    const result = await requestWrite("/api/calendar/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  updateEntry: async (entryId, input) => {
    const result = await requestWrite(
      `/api/calendar/entries/${encodeURIComponent(entryId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  deleteEntry: async (entryId) => {
    const result = await requestWrite(
      `/api/calendar/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" },
    );
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  resync: async () => {
    const scope = get().scope;
    if (scope) await get().load(scope);
  },
}));

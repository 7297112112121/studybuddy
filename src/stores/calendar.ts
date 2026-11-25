/**
 * 文件作用:日历业务数据客户端持有层
 */
import { create } from "zustand";

import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import {
  formatYearMonth,
  type CalendarEntryInput,
} from "@/modules/calendar/validators";

/** 读域:当前加载的条目范围(周锚点或年月),写成功后按此重取失效。 */
export type CalendarScope =
  | { view: "week"; weekStart: string }
  | { view: "month"; year: number; month: number };

/** 读失败归一:未授权(跳登录)或网络异常(不区分细节)。 */
export type CalendarLoadError = "UNAUTHORIZED" | "NETWORK";

type CalendarState = {
  entries: CalendarEntryView[];
  loading: boolean;
  loadError: CalendarLoadError | null;
  scope: CalendarScope | null;
  /** 加载读域条目(周/月),替换既有 entries。 */
  load: (scope: CalendarScope) => Promise<void>;
  /** 写路径:统一走契约结果(ApiResult)返回(fieldErrors 供表单定位)。 */
  createEntry: (input: CalendarEntryInput) => Promise<ApiResult>;
  updateEntry: (
    entryId: string,
    input: CalendarEntryInput,
  ) => Promise<ApiResult>;
  deleteEntry: (entryId: string) => Promise<ApiResult>;
  /** 按当前读域重取(写后失效编排之外的显式重同步,如 NOT_FOUND 静默刷新)。 */
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

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  entries: [],
  loading: false,
  loadError: null,
  scope: null,

  load: async (scope) => {
    set({ scope, loading: true, loadError: null });
    try {
      const response = await fetch(
        `/api/calendar/entries?${scopeQuery(scope)}`,
      );
      const data = (await response.json()) as ApiResult<CalendarEntryView[]>;
      if (data.ok) {
        set({ entries: data.data, loading: false });
      } else {
        set({
          entries: [],
          loading: false,
          loadError:
            data.error === API_ERROR.UNAUTHORIZED ? "UNAUTHORIZED" : "NETWORK",
        });
      }
    } catch {
      set({ entries: [], loading: false, loadError: "NETWORK" });
    }
  },

  createEntry: async (input) => {
    const result = await requestWrite("/api/calendar/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (result.ok) {
      const scope = get().scope;
      if (scope) await get().load(scope); // 写后重取
    }
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
    if (result.ok) {
      const scope = get().scope;
      if (scope) await get().load(scope);
    }
    return result;
  },

  deleteEntry: async (entryId) => {
    const result = await requestWrite(
      `/api/calendar/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" },
    );
    if (result.ok) {
      const scope = get().scope;
      if (scope) await get().load(scope);
    }
    return result;
  },

  resync: async () => {
    const scope = get().scope;
    if (scope) await get().load(scope);
  },
}));

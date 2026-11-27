/**
 * 日历业务数据客户端持有层:导航周读域与今日读域独立持有(各自锚点与竞态
 * 守卫),读/写统一经统一接口客户端请求封装(api-client)产出契约结果
 * (ApiResult);导航读域返回新鲜契约结果供调用侧分派,过期响应整体丢弃;
 * 写成功后并行重取两读域失效。
 */
import { create } from "zustand";

import { requestContractResult } from "@/common/api-client";
import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import type { CalendarEntryInput } from "@/validation/calendar-validators";

type CalendarState = {
  entries: CalendarEntryView[];
  /** 今日读域:今天所在周条目,独立于导航读域(今日日程常驻的数据源)。 */
  todayEntries: CalendarEntryView[];
  /** 今日读域锚点(周一):loadToday 记录,写后失效据此重取。 */
  todayScope: string | null;
  /** 导航读域技术失败态:失败呈现与重试的依据;未授权(UNAUTHORIZED)不落本态,由失败分支策略跳登录。 */
  loadError: boolean;
  /** 导航读域锚点(周一):null 即尚未装载。 */
  scope: string | null;
  /** 加载导航读域条目(周锚),替换既有 entries;返回新鲜契约结果(null 即过期丢弃),失败分支由调用侧经客户端失败分支策略分派。 */
  load: (weekStart: string) => Promise<ApiResult<CalendarEntryView[]> | null>;
  /** 加载今日读域条目(今天所在周,weekStart 由调用方锚定),替换 todayEntries。失败静默空:鉴权/技术异常由导航读域同一通道呈报,今日面板不为次要读域另设错误态。 */
  loadToday: (weekStart: string) => Promise<void>;
  /** 写路径:统一走契约结果(ApiResult)返回(fieldErrors 供表单定位)。 */
  createEntry: (input: CalendarEntryInput) => Promise<ApiResult>;
  updateEntry: (
    entryId: string,
    input: CalendarEntryInput,
  ) => Promise<ApiResult>;
  deleteEntry: (entryId: string) => Promise<ApiResult>;
  /** 按当前读域重取(写后失效编排之外的显式重同步,如未找到(NOT_FOUND)静默刷新)。 */
  resync: () => Promise<void>;
};

/** 写后失效编排:导航读域与今日读域并行重取(各自有锚点才取)。
    导航域即今天所在周时两读域同 URL,双请求为读域单一形状的代价。 */
function refreshAfterWrite(get: () => CalendarState): Promise<unknown> {
  const { scope, todayScope, load, loadToday } = get();
  return Promise.all([
    scope !== null ? load(scope) : Promise.resolve(),
    todayScope !== null ? loadToday(todayScope) : Promise.resolve(),
  ]);
}

/** 读域竞态守卫:单调序号,响应落库前校验仍为最新发起,过期响应整体丢弃
    (快速翻周时前序响应后到不得覆盖新读域)。两读域独立计数。 */
let navigationLoadSeq = 0;
let todayLoadSeq = 0;

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  entries: [],
  todayEntries: [],
  todayScope: null,
  loadError: false,
  scope: null,

  load: async (weekStart) => {
    const seq = ++navigationLoadSeq;
    set({ scope: weekStart, loadError: false });
    const data = await requestContractResult<CalendarEntryView[]>(
      `/api/calendar/entries?week=${encodeURIComponent(weekStart)}`,
    );
    if (seq !== navigationLoadSeq) return null;
    if (data.ok) {
      set({ entries: data.data });
    } else if (data.error === API_ERROR.UNAUTHORIZED) {
      // 未授权跳登录由调用侧经失败分支策略分派,此处不落技术失败态
      set({ entries: [] });
    } else {
      set({ entries: [], loadError: true });
    }
    return data;
  },

  loadToday: async (weekStart) => {
    const seq = ++todayLoadSeq;
    set({ todayScope: weekStart });
    const data = await requestContractResult<CalendarEntryView[]>(
      `/api/calendar/entries?week=${encodeURIComponent(weekStart)}`,
    );
    if (seq !== todayLoadSeq) return;
    set({ todayEntries: data.ok ? data.data : [] });
  },

  createEntry: async (input) => {
    const result = await requestContractResult("/api/calendar/entries", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  updateEntry: async (entryId, input) => {
    const result = await requestContractResult(
      `/api/calendar/entries/${encodeURIComponent(entryId)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  deleteEntry: async (entryId) => {
    const result = await requestContractResult(
      `/api/calendar/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" },
    );
    if (result.ok) await refreshAfterWrite(get);
    return result;
  },

  resync: async () => {
    const scope = get().scope;
    if (scope !== null) await get().load(scope);
  },
}));

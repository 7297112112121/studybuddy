/**
 * 日历业务数据客户端持有层:纯状态、收窄迁移函数与读/写编排;编排 action
 * 调用统一接口客户端请求层(calendar-api)发起请求,竞态守卫、失败落态
 * 判别与写后失效内化本文件,本 store 是自身状态的唯一写手,组件只订阅读取。
 * fetch reject 已由统一接口客户端请求封装(request)归一进契约码,编排内
 * 无异常分支。
 */
import { create } from "zustand";

import {
  createCalendarEntry,
  deleteCalendarEntry,
  fetchCalendarEntries,
  updateCalendarEntry,
} from "@/api/calendar-api";
import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import type { CalendarEntryInput } from "@/validation/calendar-validators";

/** 读域竞态守卫:单调序号,响应落库前校验仍为最新发起,过期响应整体丢弃
    (快速翻周时前序响应后到不得覆盖新读域)。两读域独立计数。 */
let navigationLoadSeq = 0;
let todayLoadSeq = 0;

type CalendarState = {
  entries: CalendarEntryView[];
  /** 今日读域:今天所在周条目,独立于导航读域(今日日程常驻的数据源)。 */
  todayEntries: CalendarEntryView[];
  /** 今日读域锚点(周一):发起时记录,写后失效据此重取。 */
  todayScope: string | null;
  /** 导航读域技术失败态:失败呈现与重试的依据;未授权(UNAUTHORIZED)不落本态,由失败分支策略跳登录。 */
  loadError: boolean;
  /** 导航读域锚点(周一):null 即尚未装载。 */
  scope: string | null;
  /** 导航读域发起落定:记录锚点并清失败态。 */
  applyNavigationLoad: (scope: string) => void;
  /** 导航读域结果落定:条目与技术失败态整段写入,判别在编排侧完成。 */
  applyNavigationResult: (
    entries: CalendarEntryView[],
    loadError: boolean,
  ) => void;
  /** 今日读域发起落定:记录锚点。 */
  applyTodayLoad: (todayScope: string) => void;
  /** 今日读域结果落定:条目写入,今日域无失败态。 */
  applyTodayEntries: (entries: CalendarEntryView[]) => void;
  /** 加载导航读域条目(周锚),替换既有 entries;返回新鲜契约结果(null 即过期丢弃),失败分支由调用侧经客户端失败分支策略(failure)分派。 */
  load: (weekStart: string) => Promise<ApiResult<CalendarEntryView[]> | null>;
  /** 加载今日读域条目(今天所在周,weekStart 由调用方锚定),替换 todayEntries。失败静默空:鉴权/技术异常由导航读域同一通道呈报,今日面板不为次要读域另设错误态。 */
  loadToday: (weekStart: string) => Promise<void>;
  /** 写路径:新增条目,统一走契约结果(ApiResult)返回(fieldErrors 供表单定位),成功后写后失效。 */
  createEntry: (input: CalendarEntryInput) => Promise<ApiResult>;
  /** 写路径:更新指定条目,成功后写后失效。 */
  updateEntry: (
    entryId: string,
    input: CalendarEntryInput,
  ) => Promise<ApiResult>;
  /** 写路径:删除指定条目,成功后写后失效。 */
  deleteEntry: (entryId: string) => Promise<ApiResult>;
  /** 按当前读域重取(写后失效编排之外的显式重同步,如未找到(NOT_FOUND)静默刷新)。 */
  resync: () => Promise<void>;
};

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  entries: [],
  todayEntries: [],
  todayScope: null,
  loadError: false,
  scope: null,
  applyNavigationLoad: (scope) => set({ scope, loadError: false }),
  applyNavigationResult: (entries, loadError) => set({ entries, loadError }),
  applyTodayLoad: (todayScope) => set({ todayScope }),
  applyTodayEntries: (entries) => set({ todayEntries: entries }),
  load: async (weekStart) => {
    const seq = ++navigationLoadSeq;
    get().applyNavigationLoad(weekStart);
    const data = await fetchCalendarEntries(weekStart);
    if (seq !== navigationLoadSeq) return null;
    if (data.ok) {
      get().applyNavigationResult(data.data, false);
    } else if (data.error === API_ERROR.UNAUTHORIZED) {
      // 未授权跳登录由调用侧经失败分支策略分派,此处不落技术失败态
      get().applyNavigationResult([], false);
    } else {
      get().applyNavigationResult([], true);
    }
    return data;
  },
  loadToday: async (weekStart) => {
    const seq = ++todayLoadSeq;
    get().applyTodayLoad(weekStart);
    const data = await fetchCalendarEntries(weekStart);
    if (seq !== todayLoadSeq) return;
    get().applyTodayEntries(data.ok ? data.data : []);
  },
  createEntry: async (input) => {
    const result = await createCalendarEntry(input);
    if (result.ok) await refreshAfterWrite();
    return result;
  },
  updateEntry: async (entryId, input) => {
    const result = await updateCalendarEntry(entryId, input);
    if (result.ok) await refreshAfterWrite();
    return result;
  },
  deleteEntry: async (entryId) => {
    const result = await deleteCalendarEntry(entryId);
    if (result.ok) await refreshAfterWrite();
    return result;
  },
  resync: async () => {
    const scope = get().scope;
    if (scope !== null) await get().load(scope);
  },
}));

/** 写后失效编排:导航读域与今日读域并行重取(各自有锚点才取)。
    导航域即今天所在周时两读域同 URL,双请求为读域单一形状的代价。 */
function refreshAfterWrite(): Promise<unknown> {
  const { scope, todayScope, load, loadToday } = useCalendarStore.getState();
  return Promise.all([
    scope !== null ? load(scope) : Promise.resolve(),
    todayScope !== null ? loadToday(todayScope) : Promise.resolve(),
  ]);
}

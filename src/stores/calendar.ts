/**
 * 日历业务数据客户端持有层:纯状态与收窄迁移函数;请求发起、竞态守卫与
 * 失败判别在统一接口客户端目录的读/写编排(calendar-sync),编排是本 store
 * 的唯一写手,组件只订阅读取。
 */
import { create } from "zustand";

import type { CalendarEntryView } from "@/modules/calendar/queries";

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
};

export const useCalendarStore = create<CalendarState>()((set) => ({
  entries: [],
  todayEntries: [],
  todayScope: null,
  loadError: false,
  scope: null,
  applyNavigationLoad: (scope) => set({ scope, loadError: false }),
  applyNavigationResult: (entries, loadError) => set({ entries, loadError }),
  applyTodayLoad: (todayScope) => set({ todayScope }),
  applyTodayEntries: (entries) => set({ todayEntries: entries }),
}));

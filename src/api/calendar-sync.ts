/**
 * 日历域读/写编排:读域竞态守卫(过期响应整体丢弃)、失败落态判别与写后
 * 失效编排;契约结果经日历 store 收窄迁移函数写入,本文件是 store 的唯一
 * 写手。fetch reject 已由统一接口客户端请求封装(request)归一进契约码,
 * 编排内无异常分支。
 */
import {
  createCalendarEntry,
  deleteCalendarEntry,
  fetchCalendarEntries,
  updateCalendarEntry,
} from "@/api/calendar-api";
import { API_ERROR, type ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import type { CalendarEntryInput } from "@/validation/calendar-validators";
import { useCalendarStore } from "@/stores/calendar";

/** 读域竞态守卫:单调序号,响应落库前校验仍为最新发起,过期响应整体丢弃
    (快速翻周时前序响应后到不得覆盖新读域)。两读域独立计数。 */
let navigationLoadSeq = 0;
let todayLoadSeq = 0;

/** 加载导航读域条目(周锚),替换既有 entries;返回新鲜契约结果(null 即过期丢弃),失败分支由调用侧经客户端失败分支策略(failure)分派。 */
export async function load(
  weekStart: string,
): Promise<ApiResult<CalendarEntryView[]> | null> {
  const seq = ++navigationLoadSeq;
  useCalendarStore.getState().applyNavigationLoad(weekStart);
  const data = await fetchCalendarEntries(weekStart);
  if (seq !== navigationLoadSeq) return null;
  if (data.ok) {
    useCalendarStore.getState().applyNavigationResult(data.data, false);
  } else if (data.error === API_ERROR.UNAUTHORIZED) {
    // 未授权跳登录由调用侧经失败分支策略分派,此处不落技术失败态
    useCalendarStore.getState().applyNavigationResult([], false);
  } else {
    useCalendarStore.getState().applyNavigationResult([], true);
  }
  return data;
}

/** 加载今日读域条目(今天所在周,weekStart 由调用方锚定),替换 todayEntries。失败静默空:鉴权/技术异常由导航读域同一通道呈报,今日面板不为次要读域另设错误态。 */
export async function loadToday(weekStart: string): Promise<void> {
  const seq = ++todayLoadSeq;
  useCalendarStore.getState().applyTodayLoad(weekStart);
  const data = await fetchCalendarEntries(weekStart);
  if (seq !== todayLoadSeq) return;
  useCalendarStore.getState().applyTodayEntries(data.ok ? data.data : []);
}

/** 写路径:新增条目,统一走契约结果(ApiResult)返回(fieldErrors 供表单定位),成功后写后失效。 */
export async function createEntry(
  input: CalendarEntryInput,
): Promise<ApiResult> {
  const result = await createCalendarEntry(input);
  if (result.ok) await refreshAfterWrite();
  return result;
}

/** 写路径:更新指定条目,成功后写后失效。 */
export async function updateEntry(
  entryId: string,
  input: CalendarEntryInput,
): Promise<ApiResult> {
  const result = await updateCalendarEntry(entryId, input);
  if (result.ok) await refreshAfterWrite();
  return result;
}

/** 写路径:删除指定条目,成功后写后失效。 */
export async function deleteEntry(entryId: string): Promise<ApiResult> {
  const result = await deleteCalendarEntry(entryId);
  if (result.ok) await refreshAfterWrite();
  return result;
}

/** 按当前读域重取(写后失效编排之外的显式重同步,如未找到(NOT_FOUND)静默刷新)。 */
export async function resync(): Promise<void> {
  const scope = useCalendarStore.getState().scope;
  if (scope !== null) await load(scope);
}

/** 写后失效编排:导航读域与今日读域并行重取(各自有锚点才取)。
    导航域即今天所在周时两读域同 URL,双请求为读域单一形状的代价。 */
function refreshAfterWrite(): Promise<unknown> {
  const { scope, todayScope } = useCalendarStore.getState();
  return Promise.all([
    scope !== null ? load(scope) : Promise.resolve(),
    todayScope !== null ? loadToday(todayScope) : Promise.resolve(),
  ]);
}

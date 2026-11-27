/**
 * 日历域统一接口端点词汇:读/写端点的 URL、方法与请求体组装单一来源,
 * 供读/写编排(calendar-sync)调用;本文件不触碰状态,不依赖 stores。
 */
import { requestContractResult } from "@/api/request";
import type { ApiErrorCode, ApiResult } from "@/common/error";
import type { CalendarEntryView } from "@/modules/calendar/queries";
import type { CalendarEntryInput } from "@/validation/calendar-validators";

/** 读端点:按周锚点(周一)取条目集合,以数据载荷(data)携带条目视图。 */
export function fetchCalendarEntries(
  weekStart: string,
): Promise<ApiResult<CalendarEntryView[], ApiErrorCode>> {
  return requestContractResult<CalendarEntryView[]>(
    `/api/calendar/entries?week=${encodeURIComponent(weekStart)}`,
  );
}

/** 写端点:新增条目,成功无载荷。 */
export function createCalendarEntry(
  input: CalendarEntryInput,
): Promise<ApiResult> {
  return requestContractResult("/api/calendar/entries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 写端点:更新指定条目。 */
export function updateCalendarEntry(
  entryId: string,
  input: CalendarEntryInput,
): Promise<ApiResult> {
  return requestContractResult(
    `/api/calendar/entries/${encodeURIComponent(entryId)}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

/** 写端点:删除指定条目。 */
export function deleteCalendarEntry(entryId: string): Promise<ApiResult> {
  return requestContractResult(
    `/api/calendar/entries/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
  );
}

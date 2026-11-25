/** 单条日历条目端点:改(PUT)与删(DELETE)共用同一契约切面。 */
import { z } from "zod";

import { respondWith, withSessionApiContract } from "@/app/api/contract";
import { deleteEntry, updateEntry } from "@/modules/calendar/service";
import { calendarEntryInputSchema } from "@/validation/calendar-validators";

type RouteContext = { params: Promise<{ id: string }> };

/** 更新指定条目;条目不存在或不属于该用户按未找到(NOT_FOUND)归一。 */
export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const result = await withSessionApiContract(
    body,
    calendarEntryInputSchema,
    (userId, input) => updateEntry(userId, id, input),
  );
  return respondWith(result);
}

/** 删除指定条目;无请求体,any schema 直通契约切面。 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const result = await withSessionApiContract(undefined, z.any(), (userId) =>
    deleteEntry(userId, id),
  );
  return respondWith(result);
}

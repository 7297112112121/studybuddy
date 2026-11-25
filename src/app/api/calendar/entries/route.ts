/**
 * 日历条目集合端点:读(GET)与写(POST)共用同一契约切面,
 * 会话守卫、入参复验与错误翻译均在切面内完成。
 */
import { respondWith, withSessionApiContract } from "@/app/api/contract";
import { listMonthEntries, listWeekEntries } from "@/modules/calendar/queries";
import { createEntry } from "@/modules/calendar/service";
import {
  calendarEntriesQuerySchema,
  calendarEntryInputSchema,
} from "@/modules/calendar/validators";

/** 条目集合读端点:?week=周一锚点读一周区间,?view=month&month=YYYY-MM 读月度区间。 */
export async function GET(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const result = await withSessionApiContract(
    query,
    calendarEntriesQuerySchema,
    async (userId, q) => {
      if ("week" in q) {
        return listWeekEntries(userId, q.week);
      }
      const [year, month] = q.month.split("-").map(Number);
      return listMonthEntries(userId, year, month);
    },
  );
  return respondWith(result);
}

/** 条目写端点:新增一条日历条目。 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const result = await withSessionApiContract(
    body,
    calendarEntryInputSchema,
    (userId, input) => createEntry(userId, input),
  );
  return respondWith(result);
}

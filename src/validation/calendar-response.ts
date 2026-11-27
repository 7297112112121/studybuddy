/**
 * 日历域响应(出参)wire 契约单一真源:统一接口读端点成功载荷的形状,
 * 客户端契约切面复验与服务端测试断言共用;只描述 wire 现状,
 * 不复用请求侧字段规则(如标题上限),避免历史数据被读路径误杀。
 */
import { z } from "zod";

import { isValidDateString, TIME_HHMM_RE } from "./calendar-request";

export const calendarEntryViewSchema = z.object({
  id: z.string(),
  date: z.string().refine(isValidDateString),
  title: z.string(),
  content: z.string().nullable(),
  startTime: z.string().regex(TIME_HHMM_RE).nullable(),
  endTime: z.string().regex(TIME_HHMM_RE).nullable(),
});

export type CalendarEntryView = z.infer<typeof calendarEntryViewSchema>;

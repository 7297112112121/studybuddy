/**
 * 统一接口端点词汇:端点路径单一来源,客户端词汇（src/api/<域>）与接口
 * 测试共引;静态路径字面量经 typedRoutes 生成路由联合在编译期校验,
 * 动态段构造以 as Route 单点收口（含条目 id 编码策略）。
 */
import type { Route } from "next";

/** 静态端点路径:拼写漂移即编译错。 */
export const API_ROUTES = {
  authRegister: "/api/auth/register",
  calendarEntries: "/api/calendar/entries",
} satisfies Record<string, Route>;

/** 日历条目端点（动态段 [id]）:路径形状与条目 id 编码单点构造。 */
export function apiCalendarEntry(entryId: string): Route {
  return `/api/calendar/entries/${encodeURIComponent(entryId)}` as Route;
}

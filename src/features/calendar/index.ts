/**
 * 日程域 UI 顶入口（业务切片：features 持有 UI，见 docs/dev/代码目录.md）。
 *
 * 公共契约只从此处导出（app 跨域仅可 import 顶入口，禁深路径）；
 * 业务逻辑（queries/service/validators）在 src/modules/calendar；
 */
export { default as CalendarPageClient } from "./components/CalendarPageClient";
export { default as CalendarScreen } from "./components/CalendarScreen";
export { default as WeekView } from "./components/WeekView";

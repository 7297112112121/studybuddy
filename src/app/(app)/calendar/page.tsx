/**
 * /calendar 薄壳（design「路由层薄壳」契约，数据流向评审裁决 1/2）：零业务
 * 逻辑、零服务端数据读，UI 与数据全部下沉客户端组合层（features）与 store；
 * 守卫继承 (app)/layout 客户端会话守卫（裁决 5a）。
 *
 * 周定位经 searchParams 承载（?week=YYYY-MM-DD，周一锚）：解析与回退
 * 语义在域路由词汇（routes.ts）承接，薄壳只透传；历史 view/month 参数
 * 不再承载，缺省/非法静默回退今天所在周。
 */
import {
  CalendarPageClient,
  type CalendarPageParams,
} from "@/features/calendar";

export const instant = false;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarPageParams>;
}) {
  const params = await searchParams;
  return <CalendarPageClient params={params} />;
}

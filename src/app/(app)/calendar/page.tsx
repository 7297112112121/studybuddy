/**
 * /calendar 薄壳（design「路由层薄壳」契约，数据流向评审裁决 1/2）：零业务
 * 逻辑、零服务端数据读，UI 与数据全部下沉客户端屏（features）与 store；
 * 守卫继承 (app)/layout 客户端会话守卫（裁决 5a）。
 *
 * 视图态经 searchParams 承载（design「UI 与组件」节，proposal 开放问题 #1
 * 闭合）：解析与回退语义在 CalendarPageClient 内承接，薄壳只透传。
 */
import { CalendarPageClient } from "@/features/calendar";

export const instant = false;

type CalendarSearchParams = { view?: string; week?: string; month?: string };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const params = await searchParams;
  return <CalendarPageClient params={params} />;
}

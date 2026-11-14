/**
 * (app) 路由组布局（B6 受保护路由拦截，design「路由层薄壳」契约）。
 *
 * 未登录 → 服务端 redirect 到登录页：拦截在服务端完成，未登录响应不携带
 * 受保护页面内容；已登录 → 渲染子路由。读 cookie 属动态渲染，后退导航
 * 触发 RSC 重取（design 边界 B6）。
 *
 * Next 16 cacheComponents 预渲染校验豁免（与根布局同一豁免，instant =
 * false）：getCurrentSession 经 headers() 读请求头，无法纳入静态预渲染，
 * 允许该路由阻塞在请求期渲染——守卫语义要求逐请求判定。
 */
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export default async function AppLayout(props: LayoutProps<"/">) {
  const session = await getCurrentSession();
  if (!session) {
    // B6：未登录不渲染 children（redirect 抛出终止本段渲染）
    redirect(ROUTES.login);
  }
  return <>{props.children}</>;
}

/**
 * 首页薄壳：按登录态分流（与 (app)/workbench 同一守卫形态）——
 * 已登录 → /workbench 进工作台；未登录 → /login 进登录页。
 * 无自身 UI（首个特性面为 AXY-8 登录注册）；守卫在服务端完成，
 * 未登录响应不携带受保护内容。
 *
 * Next 16 cacheComponents 预渲染校验豁免（与 (app) 布局同一豁免，
 * instant = false）：getCurrentSession 经 headers() 读请求头，无法纳入
 * 静态预渲染，分流语义要求逐请求判定。
 */
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export default async function HomePage() {
  const session = await getCurrentSession();
  return redirect(session ? ROUTES.workbench : ROUTES.login);
}

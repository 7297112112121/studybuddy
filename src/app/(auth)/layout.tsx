/**
 * (auth) 路由组布局（R12 守卫，design「路由层薄壳」契约）。
 *
 * 会话真相只在服务端：已登录 → 渲染 AuthRedirect 不渲染 children（已登录
 * 不再看到登录/注册表单）；未登录 → 照常渲染子路由（/login、/register）。
 * 跳转策略（back / replace workbench）由 AuthRedirect（client）承载。
 *
 * Next 16 cacheComponents 预渲染校验豁免（与根布局同一豁免，instant =
 * false）：getCurrentSession 经 headers() 读请求头，无法纳入静态预渲染，
 * 允许该路由阻塞在请求期渲染——会话守卫必须逐请求判定，不可静态化。
 */
import { AuthRedirect, getCurrentSession } from "@/modules/auth";

export const instant = false;

export default async function AuthLayout(props: LayoutProps<"/">) {
  const session = await getCurrentSession();
  if (session) {
    return <AuthRedirect />;
  }
  return <>{props.children}</>;
}

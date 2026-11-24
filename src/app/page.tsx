/**
 * 首页薄壳：按登录态分流（数据流向评审裁决 5a）——已登录 → /workbench 进
 * 工作台；未登录 → /login 进登录页。无自身 UI，分流在客户端屏经会话 store
 * 完成，服务端零会话读（可静态预渲染）。
 */
import { HomeRedirect } from "@/features/auth";

export default function HomePage() {
  return <HomeRedirect />;
}

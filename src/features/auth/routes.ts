/**
 * 认证域路由词汇:登录/注册视图的 URL 类型与链接派生(纯函数,无 React)。
 * 跳转动作由组合层承接,本模块只产出视图类型与链接。
 */
import { ROUTES } from "@/common/routes";

/** 认证屏视图:登录或注册(与路由 /login、/register 一一对应)。 */
export type AuthView = "login" | "register";

/** 视图 → 路由链接:视图切换同步 URL 用(组合层承接实际跳转)。 */
export function viewHref(view: AuthView): string {
  return view === "login" ? ROUTES.login : ROUTES.register;
}

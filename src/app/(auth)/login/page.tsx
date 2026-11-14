/**
 * /login 薄壳（design「路由层薄壳」契约）：零业务逻辑，仅挂 AuthScreen
 * 登录视图；守卫在 (auth) 布局（R12）。
 */
import { AuthScreen } from "@/modules/auth";

export default function LoginPage() {
  return <AuthScreen initialView="login" />;
}

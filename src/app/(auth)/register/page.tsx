/**
 * /register 薄壳（design「路由层薄壳」契约）：零业务逻辑，仅挂 AuthScreen
 * 注册视图；守卫在 (auth) 布局（R12）。
 */
import { AuthScreen } from "@/modules/auth";

export default function RegisterPage() {
  return <AuthScreen initialView="register" />;
}

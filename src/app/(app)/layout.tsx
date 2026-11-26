/**
 * (app) 路由组布局：挂已认证之门——未登录 replace 到登录页，会话判定前不渲染
 * 受保护内容。安全边界在统一接口逐端点会话校验（守卫客户端化的配套硬约束），
 * 本布局门只做路由级分流。
 */
import { AuthenticatedGate } from "@/app/_guards/SessionGate";
import { ROUTES } from "@/common/routes";

export default function AppLayout(props: LayoutProps<"/">) {
  return (
    <AuthenticatedGate fallbackTo={ROUTES.login}>
      {props.children}
    </AuthenticatedGate>
  );
}

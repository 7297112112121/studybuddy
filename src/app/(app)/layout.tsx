/**
 * (app) 路由组布局：会话门声明 user 门向——未登录 replace 到登录页，会话判定
 * 前不渲染受保护内容。安全边界在统一接口逐端点会话校验（守卫客户端化的配套
 * 硬约束），本布局门只做路由级分流。
 */
import SessionGate from "@/app/_guards/SessionGate";
import { ROUTES } from "@/common/routes";

export default function AppLayout(props: LayoutProps<"/">) {
  return (
    <SessionGate require="user" fallbackTo={ROUTES.login}>
      {props.children}
    </SessionGate>
  );
}

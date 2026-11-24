/**
 * 顶部视图切换 tab（R16）。纯受控：激活态与切换回调均来自 AuthScreen。
 * 视觉：shadcn Tabs（Radix，ADR-0004），受控 value/onValueChange 接
 * switchView；内容区仍由 AuthScreen 条件渲染 LoginForm/RegisterForm，
 * 不使用 TabsContent（表单 id 与视图同步逻辑保持不变）。
 */
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthView = "login" | "register";

type AuthTabsProps = {
  active: AuthView;
  onSwitch: (view: AuthView) => void;
};

export default function AuthTabs(props: AuthTabsProps) {
  return (
    <Tabs
      value={props.active}
      onValueChange={(value) => props.onSwitch(value as AuthView)}
      className="mb-6"
    >
      <TabsList aria-label="登录或注册" className="grid w-full grid-cols-2">
        {/* Radix Trigger 只绑 onMouseDown(jsdom 的 fireEvent.click 不触发),
            补 onClick 保证点击选择在两类环境一致;浏览器端与 Radix 的
            mousedown 选择双触发,switchView 幂等无副作用。 */}
        <TabsTrigger value="login" onClick={() => props.onSwitch("login")}>
          登录
        </TabsTrigger>
        <TabsTrigger
          value="register"
          onClick={() => props.onSwitch("register")}
        >
          注册
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

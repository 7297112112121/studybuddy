
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

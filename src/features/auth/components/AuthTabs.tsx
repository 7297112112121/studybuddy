
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthView } from "../routes";

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

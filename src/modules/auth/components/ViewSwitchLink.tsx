/**
 * 底部视图切换链接（R16）。按钮语义（不导航），切换走 AuthScreen 的
 * switchView（保留表单值、清错误、replaceState 同步 URL）；R10「去登录」复用。
 * 视觉：shadcn Button link variant（去内边距以适配行内排版）。
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AuthView } from "./AuthTabs";

type ViewSwitchLinkProps = {
  target: AuthView;
  prefix: string;
  onSwitch: (view: AuthView) => void;
  children: ReactNode;
};

export default function ViewSwitchLink(props: ViewSwitchLinkProps) {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      {props.prefix}
      <Button
        type="button"
        variant="link"
        onClick={() => props.onSwitch(props.target)}
        className="ml-1 h-auto p-0"
      >
        {props.children}
      </Button>
    </p>
  );
}

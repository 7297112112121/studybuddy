/**
 * 底部视图切换链接（R16）。按钮语义（不导航），切换走 AuthScreen 的
 * switchView（保留表单值、清错误、replaceState 同步 URL）；R10「去登录」复用。
 */
import type { ReactNode } from "react";
import type { AuthView } from "./AuthTabs";

type ViewSwitchLinkProps = {
  target: AuthView;
  prefix: string;
  onSwitch: (view: AuthView) => void;
  children: ReactNode;
};

export default function ViewSwitchLink(props: ViewSwitchLinkProps) {
  return (
    <p className="mt-4 text-center text-sm text-slate-500">
      {props.prefix}
      <button
        type="button"
        onClick={() => props.onSwitch(props.target)}
        className="ml-1 font-medium text-slate-700 underline"
      >
        {props.children}
      </button>
    </p>
  );
}

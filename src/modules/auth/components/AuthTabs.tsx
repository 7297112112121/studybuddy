/**
 * 顶部视图切换 tab（R16）。纯受控：激活态与切换回调均来自 AuthScreen。
 */
export type AuthView = "login" | "register";

type AuthTabsProps = {
  active: AuthView;
  onSwitch: (view: AuthView) => void;
};

export default function AuthTabs(props: AuthTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="登录或注册"
      className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={props.active === "login"}
        aria-controls="auth-login"
        onClick={() => props.onSwitch("login")}
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          props.active === "login"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-500"
        }`}
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={props.active === "register"}
        aria-controls="auth-register"
        onClick={() => props.onSwitch("register")}
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          props.active === "register"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-500"
        }`}
      >
        注册
      </button>
    </div>
  );
}

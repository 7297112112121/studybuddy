/**
 * 密码输入框（R17 显隐切换）。登录密码、注册密码、确认密码三处同构复用；
 * 显隐为视图局部态（wireframe 同构），不进 AuthScreen 全局状态。纯受控。
 */
import { useState } from "react";
import type { ReactNode } from "react";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  /** 标签行右侧动作位（登录视图放忘记密码链接，R19）。 */
  action?: ReactNode;
};

export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const errorId = `${props.id}-error`;
  const hintId = `${props.id}-hint`;
  const describedBy = [
    props.error !== undefined ? errorId : null,
    props.hint !== undefined ? hintId : null,
  ]
    .filter((id) => id !== null)
    .join(" ");

  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-slate-700"
        >
          {props.label}
        </label>
        {props.action}
      </div>
      <div className="relative mt-1">
        <input
          id={props.id}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={props.error !== undefined ? true : undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
          className={`w-full rounded-md border px-3 py-2 pr-16 text-sm outline-none focus:ring-2 focus:ring-slate-300 ${
            props.error !== undefined ? "border-red-500" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          aria-label={visible ? "隐藏密码" : "显示密码"}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-2 my-auto h-fit text-sm text-slate-500"
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      {props.hint !== undefined && (
        <p id={hintId} className="mt-1 text-xs text-slate-400">
          {props.hint}
        </p>
      )}
      {props.error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {props.error}
        </p>
      )}
    </div>
  );
}

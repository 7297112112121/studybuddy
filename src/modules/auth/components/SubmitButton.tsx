/**
 * 提交按钮（R5）。受 submitting 驱动禁用与文案键切换；本任务 submitting
 * 恒为 false（不接网络），真实提交由 Task 10 接入。
 */
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type SubmitButtonProps = {
  submitting: boolean;
  pendingKey: "submit.loggingIn" | "submit.registering";
  /** 空闲态文案（登录 / 注册并进入）。 */
  children: ReactNode;
};

export default function SubmitButton(props: SubmitButtonProps) {
  const t = useTranslations("auth");
  return (
    <button
      type="submit"
      disabled={props.submitting}
      className="w-full rounded-md bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {props.submitting ? t(props.pendingKey) : props.children}
    </button>
  );
}

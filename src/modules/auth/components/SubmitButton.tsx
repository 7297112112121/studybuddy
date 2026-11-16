/**
 * 提交按钮（R5）。受 submitting 驱动禁用与文案键切换。
 * 视觉：shadcn Button（default variant = bg-primary）。
 */
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  submitting: boolean;
  pendingKey: "submit.loggingIn" | "submit.registering";
  /** 空闲态文案（登录 / 注册并进入）。 */
  children: ReactNode;
};

export default function SubmitButton(props: SubmitButtonProps) {
  const t = useTranslations("auth");
  return (
    <Button
      type="submit"
      disabled={props.submitting}
      className="h-10 w-full"
    >
      {props.submitting ? t(props.pendingKey) : props.children}
    </Button>
  );
}

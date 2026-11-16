/**
 * 提交按钮（R5）。受 submitting 驱动禁用与文案键切换。
 * 视觉：shadcn Button（default variant）+ aurora 渐变面（aqua→aqua-bright→
 * magenta,规格 100deg/38% via）；文字色取 .aurora-theme 作用域内的
 * --primary-foreground（墨色，亮渐变面上对比达标），主 CTA 的签名观感。
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
      className="h-11 w-full rounded-xl bg-linear-[100deg] from-aurora-aqua from-0% via-aurora-aqua-bright via-38% to-aurora-magenta shadow-lg shadow-aurora-aqua/30"
    >
      {props.submitting ? t(props.pendingKey) : props.children}
    </Button>
  );
}

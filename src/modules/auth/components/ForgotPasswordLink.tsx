/**
 * 忘记密码占位链接（R19，仅登录视图）。preventDefault 不导航，点击后
 * 呈现「暂未开通」提示；提示出现与否是本组件的局部视图态。
 */
import { useState } from "react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";

export default function ForgotPasswordLink() {
  const t = useTranslations("auth");
  const [noticeShown, setNoticeShown] = useState<boolean>(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    setNoticeShown(true);
  }

  return (
    <span className="flex items-center gap-2">
      <a
        href="#"
        onClick={handleClick}
        className="text-sm text-slate-500 underline"
      >
        忘记密码?
      </a>
      {noticeShown && (
        <span role="status" className="text-sm text-amber-700">
          {t("forgotPassword.unavailable")}
        </span>
      )}
    </span>
  );
}

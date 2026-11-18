"use client";

/**
 * /calendar 路由错误边界(AXY-23 design「UI 与组件」节,R9/E-05)。
 *
 * 周视图与月视图共用的页面级加载失败兜底:queries 层 DB 异常上抛至此,
 * 呈现 E-05 逐字文案与「重试」按钮(reset 重跑服务端渲染);error.message
 * 不呈现给用户,仅 console 记录供诊断。
 */
import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("calendar");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <p className="text-sm text-muted-foreground">{t("week.loadFailed")}</p>
      <Button onClick={reset}>{t("week.retry")}</Button>
    </div>
  );
}

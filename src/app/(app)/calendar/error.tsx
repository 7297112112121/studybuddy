"use client";

/**
 * /calendar 路由错误边界:渲染失败兜底(数据失败经统一接口判别联合返回,
 * 不经此边界),呈现通用文案与重试按钮;error 值不呈现给用户,仅 console 留痕。
 */
import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function CalendarError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
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
      <Button onClick={retry}>{t("week.retry")}</Button>
    </div>
  );
}

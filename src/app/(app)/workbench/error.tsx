"use client";

/**
 * /workbench 路由错误边界:渲染失败兜底,呈现通用文案与重试按钮;
 * error 值不呈现给用户,仅 console 留痕。
 */
import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function WorkbenchError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useTranslations("workbench");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 text-center"
    >
      <p className="text-sm text-muted-foreground">{t("error.loadFailed")}</p>
      <Button onClick={retry}>{t("error.retry")}</Button>
    </div>
  );
}

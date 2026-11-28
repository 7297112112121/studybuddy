"use client";

/** 条目表单字段块（纯展示）：标签 + 控件 + 字段错误行的同构排版。 */
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";

import type { ReactNode } from "react";

type EntryFieldRowProps = {
  /** 控件 id，与 Label 的 htmlFor 绑定。 */
  id: string;
  label: string;
  /** 字段错误 messageKey（经根级词条渲染），缺省不渲染错误行。 */
  error?: string;
  children: ReactNode;
};

export default function EntryFieldRow({
  id,
  label,
  error,
  children,
}: EntryFieldRowProps) {
  const tRoot = useTranslations();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-sm">{tRoot(error)}</p>}
    </div>
  );
}

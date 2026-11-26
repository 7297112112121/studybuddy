/**
 * 迷你月历屏状态机：显示月态，初值随 URL 周所在月，翻月为纯客户端态。
 * 「URL 周变化回落所在月」不由本 hook 承担——父级组合层以 key 绑 URL 周
 * 所在月重挂载（useState 初始化器重跑），同月内翻周不重挂载、手动翻月保留。
 */
import { useState } from "react";

import { addMonths } from "./dates";

/** "YYYY-MM-DD" → 所在年月（取前七位）。 */
function monthOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function useMiniMonth(weekStart: string) {
  const [shown, setShown] = useState(() => monthOf(weekStart));

  return {
    shown,
    onPrev: () => setShown((m) => addMonths(m.year, m.month, -1)),
    onNext: () => setShown((m) => addMonths(m.year, m.month, 1)),
  };
}

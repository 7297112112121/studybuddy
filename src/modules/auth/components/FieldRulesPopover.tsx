/**
 * 字段规则浮层（AXY-8 UI 优化）：锚定输入框正下方的底层浮层容器，
 * 承载规则清单并逐条标记通过（✓）/未过（×）。
 *
 * 组件选型说明（前端设计规范门禁）：shadcn Popover 为触发式点击交互
 * （Radix anchor → trigger），与本浮层「聚焦展开 + 实时侦测、随输入
 * 重渲染」的语义不符，确认 registry 无合适组件后手写。
 *
 * 纯展示组件：开合由父级字段的 focus-within 态驱动，规则由父级传入
 * （单一来源 validators 的 *RuleStates）；对读屏器隐藏——字段的
 * aria-invalid / hint 已承载同等信息，浮层是 sighted 专属增强。
 */
import { CheckIcon, XIcon } from "lucide-react";
import type { FieldRuleState } from "../validators";

type FieldRulesPopoverProps = {
  rules: FieldRuleState[];
  open: boolean;
};

export default function FieldRulesPopover(props: FieldRulesPopoverProps) {
  if (!props.open) {
    return null;
  }
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-border bg-popover p-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1 [animation-duration:180ms] [animation-fill-mode:both] motion-reduce:animate-none"
    >
      <ul className="space-y-1.5">
        {props.rules.map((rule) => (
          <li
            key={rule.label}
            data-passed={rule.passed}
            className="flex items-center gap-2 text-xs"
          >
            {rule.passed ? (
              <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-aurora-aqua" />
            ) : (
              <XIcon aria-hidden="true" className="size-3.5 shrink-0 text-destructive" />
            )}
            <span className={rule.passed ? "text-muted-foreground" : "text-foreground"}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

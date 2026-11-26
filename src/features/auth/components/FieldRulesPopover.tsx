/**
 * 字段规则浮层：锚定输入框正下方的底层浮层容器，
 */
import { CheckIcon, XIcon } from "lucide-react";
import type { FieldRuleState } from "../useClientScreen";

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
      className="pointer-events-none absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-border bg-popover p-3 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1 [animation-duration:180ms] [animation-fill-mode:both] motion-reduce:animate-none"
    >
      <ul className="space-y-1.5">
        {props.rules.map((rule) => (
          <li
            key={rule.label}
            data-passed={rule.passed}
            className="flex items-center gap-2 text-xs"
          >
            {rule.passed ? (
              <CheckIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-aurora-aqua"
              />
            ) : (
              <XIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-destructive"
              />
            )}
            <span
              className={
                rule.passed ? "text-muted-foreground" : "text-foreground"
              }
            >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}


import { useState } from "react";
import type { FocusEvent } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { FieldRuleState } from "../useClientScreen";
import FieldRulesPopover from "./FieldRulesPopover";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  /** 聚焦浮层的规则清单（useClientScreen 的 *RuleStates / 调用方补充规则）。 */
  rules?: FieldRuleState[];
};

export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const hintId = `${props.id}-hint`;

  // 浮层开合：包裹层 focus-within 语义——focusin/focusout 冒泡到这里，
  // relatedTarget 仍在层内（如显隐按钮）时不收起。
  function handleFocus(event: FocusEvent<HTMLDivElement>): void {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setRulesOpen(true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setRulesOpen(false);
  }

  return (
    <div>
      <Label htmlFor={props.id}>{props.label}</Label>
      <div className="relative mt-1" onFocus={handleFocus} onBlur={handleBlur}>
        <Input
          id={props.id}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={props.invalid ? true : undefined}
          aria-describedby={props.hint !== undefined ? hintId : undefined}
          className="h-11 rounded-xl bg-muted/60 pr-11 focus-visible:border-aurora-aqua focus-visible:ring-aurora-aqua/30"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "隐藏密码" : "显示密码"}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-1 my-auto text-muted-foreground"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
        {props.rules !== undefined && (
          <FieldRulesPopover rules={props.rules} open={rulesOpen} />
        )}
      </div>
      {props.hint !== undefined && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {props.hint}
        </p>
      )}
    </div>
  );
}

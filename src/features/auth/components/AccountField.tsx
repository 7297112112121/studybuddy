/**
 * 账户名输入框（登录/注册单一实现）。
 */
import { useState } from "react";
import type { FocusEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FieldRuleState } from "../utils";
import FieldRulesPopover from "./FieldRulesPopover";

type AccountFieldProps = {
  id: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  rules?: FieldRuleState[];
};

export default function AccountField(props: AccountFieldProps) {
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);

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
      <Label htmlFor={props.id}>账户名</Label>
      <div className="relative mt-1" onFocus={handleFocus} onBlur={handleBlur}>
        <Input
          id={props.id}
          type="text"
          autoComplete="username"
          placeholder="如 zhang_san"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={props.invalid ? true : undefined}
          className="h-11 rounded-xl bg-muted/60 focus-visible:border-aurora-aqua focus-visible:ring-aurora-aqua/30"
        />
        {props.rules !== undefined && (
          <FieldRulesPopover rules={props.rules} open={rulesOpen} />
        )}
      </div>
    </div>
  );
}

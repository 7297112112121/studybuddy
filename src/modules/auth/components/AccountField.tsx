/**
 * 账户名输入框（登录/注册单一实现）。纯受控。
 * D-12：无 maxLength、无字符过滤逻辑——非法输入原样保留，错误态只以
 * 红框呈现（aria-invalid，文案不再渲染）。
 * 视觉：shadcn Label + Input（ADR-0004），焦点环 aurora aqua；错误态经
 * aria-invalid 由 Input 内建描边呈现（不再手拼 border-red-500）。
 * 聚焦时展开规则浮层（FieldRulesPopover），实时侦测输入（AXY-8 UI 优化）：
 * focus 态挂在 relative 包裹层上（React 的 focus 事件冒泡，点显隐按钮
 * 不收起浮层）。
 */
import { useState } from "react";
import type { FocusEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FieldRuleState } from "../validators";
import FieldRulesPopover from "./FieldRulesPopover";

type AccountFieldProps = {
  id: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  /** 聚焦规则浮层的清单（accountRuleStates）；不传则无浮层（登录侧不用）。 */
  rules?: FieldRuleState[];
};

export default function AccountField(props: AccountFieldProps) {
  // 浮层开合：包裹层 focus-within 语义——focusin/focusout 冒泡到这里，
  // relatedTarget 仍在层内（如显隐按钮）时不收起。
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

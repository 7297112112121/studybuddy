/**
 * 密码输入框（R17 显隐切换）。登录密码、注册密码、确认密码三处同构复用；
 * 显隐为视图局部态（wireframe 同构），不进 AuthScreen 全局状态。纯受控。
 * 错误态只以红框呈现（aria-invalid，文案不再渲染），hint 文案保留。
 * 视觉：shadcn Label + Input + ghost icon Button（lucide Eye/EyeOff，
 * 显隐图标按钮的可访问名经 aria-label 保持「显示密码/隐藏密码」不变），
 * 焦点环 aurora aqua。
 */
import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
};

export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const hintId = `${props.id}-hint`;

  return (
    <div>
      <Label htmlFor={props.id}>{props.label}</Label>
      <div className="relative mt-1">
        <Input
          id={props.id}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={props.invalid ? true : undefined}
          aria-describedby={props.hint !== undefined ? hintId : undefined}
          className="h-11 rounded-xl bg-muted/40 pr-11 focus-visible:border-aurora-aqua focus-visible:ring-aurora-aqua/30"
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
      </div>
      {props.hint !== undefined && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {props.hint}
        </p>
      )}
    </div>
  );
}

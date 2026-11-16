/**
 * 账户名输入框（登录/注册单一实现）。纯受控。
 * D-12：无 maxLength、无字符过滤逻辑——非法输入原样保留，错误态只以
 * 红框呈现（aria-invalid，文案不再渲染）。
 * 视觉：shadcn Label + Input（ADR-0004），焦点环 aurora aqua；错误态经
 * aria-invalid 由 Input 内建描边呈现（不再手拼 border-red-500）。
 */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
type AccountFieldProps = {
  id: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
};

export default function AccountField(props: AccountFieldProps) {
  return (
    <div>
      <Label htmlFor={props.id}>账户名</Label>
      <Input
        id={props.id}
        type="text"
        autoComplete="username"
        placeholder="如 zhang_san"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.invalid ? true : undefined}
        className="mt-1 h-11 rounded-xl bg-muted/60 focus-visible:border-aurora-aqua focus-visible:ring-aurora-aqua/30"
      />
    </div>
  );
}

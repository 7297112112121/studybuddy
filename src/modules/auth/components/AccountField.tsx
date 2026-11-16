/**
 * 账户名输入框（登录/注册单一实现，R2/R8 错误文案呈现）。纯受控。
 * D-12：无 maxLength、无字符过滤逻辑——非法输入原样保留，文案交由校验链呈现。
 * 视觉：shadcn Label + Input（ADR-0004），焦点环 aurora aqua；错误态经
 * aria-invalid 由 Input 内建描边呈现（不再手拼 border-red-500）。
 */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
type AccountFieldProps = {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function AccountField(props: AccountFieldProps) {
  const errorId = `${props.id}-error`;
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
        aria-invalid={props.error !== undefined ? true : undefined}
        aria-describedby={props.error !== undefined ? errorId : undefined}
        className="mt-1 h-10 focus-visible:border-aurora-aqua focus-visible:ring-aurora-aqua/30"
      />
      {props.error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {props.error}
        </p>
      )}
    </div>
  );
}

/**
 * 协议勾选框（R4）。协议名为纯文本提及，无链接（非目标 #5）。
 * 错误态：勾选框 aria-invalid + 错误文案。纯受控。
 *
 * 刻意保留原生 input[type=checkbox]（组件测试按 HTMLInputElement 断言
 * aria-invalid），仅以 token 类替换裸灰阶/红色；Radix Checkbox 渲染
 * button[role=checkbox]，语义不兼容（见 docs/dev/前端设计规范.md 表单策略）。
 */
type AgreementCheckboxProps = {
  id: string;
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
};

export default function AgreementCheckbox(props: AgreementCheckboxProps) {
  const errorId = `${props.id}-error`;
  return (
    <div>
      <label
        htmlFor={props.id}
        className="flex items-start gap-2 text-sm text-muted-foreground"
      >
        <input
          id={props.id}
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
          aria-invalid={props.error !== undefined ? true : undefined}
          aria-describedby={props.error !== undefined ? errorId : undefined}
          className={`mt-0.5 size-4 accent-primary ${
            props.error !== undefined
              ? "outline-2 outline-offset-0 outline-destructive"
              : ""
          }`}
        />
        <span>我已阅读并同意《用户协议》与《隐私政策》</span>
      </label>
      {props.error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-destructive">
          {props.error}
        </p>
      )}
    </div>
  );
}

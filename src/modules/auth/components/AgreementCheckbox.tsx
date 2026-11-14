/**
 * 协议勾选框（R4）。协议链接为占位不跳转（design 边界 #9，preventDefault）。
 * 错误态：勾选框 aria-invalid + 错误文案。纯受控。
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
        className="flex items-start gap-2 text-sm text-slate-600"
      >
        <input
          id={props.id}
          type="checkbox"
          checked={props.checked}
          onChange={(event) => props.onChange(event.target.checked)}
          aria-invalid={props.error !== undefined ? true : undefined}
          aria-describedby={props.error !== undefined ? errorId : undefined}
          className={`mt-0.5 h-4 w-4 ${
            props.error !== undefined ? "outline-red-500" : ""
          }`}
        />
        <span>
          我已阅读并同意
          <a
            href="#"
            onClick={(event) => event.preventDefault()}
            className="text-slate-700 underline"
          >
            《用户协议》
          </a>
          与
          <a
            href="#"
            onClick={(event) => event.preventDefault()}
            className="text-slate-700 underline"
          >
            《隐私政策》
          </a>
        </span>
      </label>
      {props.error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {props.error}
        </p>
      )}
    </div>
  );
}

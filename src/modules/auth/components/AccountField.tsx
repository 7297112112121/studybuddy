/**
 * 账户名输入框（登录/注册单一实现，R2/R8 错误文案呈现）。纯受控。
 * D-12：无 maxLength、无字符过滤逻辑——非法输入原样保留，文案交由校验链呈现。
 */
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
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-slate-700"
      >
        账户名
      </label>
      <input
        id={props.id}
        type="text"
        autoComplete="username"
        placeholder="如 zhang_san"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.error !== undefined ? true : undefined}
        aria-describedby={props.error !== undefined ? errorId : undefined}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 ${
          props.error !== undefined ? "border-red-500" : "border-slate-300"
        }`}
      />
      {props.error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {props.error}
        </p>
      )}
    </div>
  );
}

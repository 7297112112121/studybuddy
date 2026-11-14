/**
 * 注册手机号输入框（R8 错误文案呈现）。maxLength=11 为硬边界（design 边界 #1）。
 * 纯受控；值来自 AuthScreen 的 account（R16 跨视图保留）。
 */
type PhoneFieldProps = {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function PhoneField(props: PhoneFieldProps) {
  const errorId = `${props.id}-error`;
  return (
    <div>
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-slate-700"
      >
        手机号
      </label>
      <input
        id={props.id}
        type="tel"
        inputMode="numeric"
        maxLength={11}
        autoComplete="tel"
        placeholder="11 位手机号，用作登录账号"
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

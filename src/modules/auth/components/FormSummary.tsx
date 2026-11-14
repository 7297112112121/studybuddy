/**
 * 顶部错误汇总（R1）。按传入 errors 的键数计数（协议勾选错误不进此计数，
 * 单独呈现在 AgreementCheckbox），文案经 ICU {count} 插值；无错误不渲染。
 */
import { useTranslations } from "next-intl";

type FormSummaryProps = {
  errors: Partial<
    Record<"account" | "phone" | "password" | "confirmPassword", string>
  >;
};

export default function FormSummary(props: FormSummaryProps) {
  const t = useTranslations("auth");
  const count = Object.keys(props.errors).length;
  if (count === 0) {
    return null;
  }
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
    >
      <span aria-hidden="true" className="font-bold">
        !
      </span>
      <span>{t("summary.errors", { count })}</span>
    </div>
  );
}

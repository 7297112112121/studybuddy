/**
 * 第三方登录占位（R18）。两按钮禁用态 + 「本期不做，仅占位」文案，纯静态。
 */
import { useTranslations } from "next-intl";

export default function OAuthPlaceholder() {
  const t = useTranslations("auth");
  return (
    <section
      aria-label="其他登录方式"
      className="mt-6 border-t border-slate-200 pt-4"
    >
      <p className="text-sm font-medium text-slate-600">其他登录方式</p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          disabled
          className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-400 disabled:cursor-not-allowed"
        >
          微信登录
        </button>
        <button
          type="button"
          disabled
          className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-400 disabled:cursor-not-allowed"
        >
          手机号一键登录
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">{t("oauth.placeholder")}</p>
    </section>
  );
}

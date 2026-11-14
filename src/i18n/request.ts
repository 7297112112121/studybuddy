import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import auth from "@/locales/zh-CN/auth.json";

/**
 * 请求级 i18n 配置（ADR-0010 无前缀策略：URL 不带语言前缀）。
 *
 * - 语言协商：cookie（NEXT_LOCALE）优先，其次路由段 requestLocale
 *   （无前缀策略下恒为 undefined，保留以兼容未来迁移 [lang] 前缀路由），
 *   兜底 zh-CN（当前唯一目标语言）；
 * - cookies() 仅在请求作用域可用——构建期静态预渲染与测试直调时不可达，
 *   此时按 ADR-0010 缺省兜底 zh-CN，保证无 .env / 无请求上下文仍可构建；
 * - 文案以 JSON 命名空间并入 messages，客户端组件经
 *   NextIntlClientProvider（根布局注入）使用 useTranslations("auth")。
 */
const SUPPORTED_LOCALES = ["zh-CN"] as const;
const DEFAULT_LOCALE = "zh-CN";

async function resolveLocale(
  requestLocale: Promise<string | undefined>,
): Promise<string> {
  const candidates: Array<string | undefined> = [];
  try {
    const cookieStore = await cookies();
    candidates.push(cookieStore.get("NEXT_LOCALE")?.value);
  } catch {
    // 非请求作用域（构建期预渲染 / 单测直调）：跳过 cookie 协商
  }
  candidates.push(await requestLocale);

  return (
    candidates.find(
      (candidate): candidate is string =>
        candidate !== undefined &&
        (SUPPORTED_LOCALES as readonly string[]).includes(candidate),
    ) ?? DEFAULT_LOCALE
  );
}

export default getRequestConfig(async ({ requestLocale }) => {
  return {
    locale: await resolveLocale(requestLocale),
    messages: { auth },
  };
});

import { getRequestConfig } from "next-intl/server";
import auth from "@/locales/zh-CN/auth.json";

/**
 * 请求级 i18n 配置（ADR-0010 无前缀策略：URL 不带语言前缀）。
 *
 * - 当前唯一目标语言 zh-CN，直接固定 locale：不读 cookies()，也不读
 *   requestLocale（next-intl 的 requestLocale 兜底经 next/headers 读
 *   X-NEXT-INTL-LOCALE 头，同为动态 API）。整个配置零动态 API，
 *   根布局 getMessages() 可纳入静态预渲染，无需 instant = false 豁免
 *   （AXY-8 遗留首屏问题修复：此前根布局豁免导致全站静态 shell 为空）；
 * - 多语言上线时按 ADR-0010 终态把语言协商迁入 proxy，届时本文件再接
 *   requestLocale（proxy 注入请求头）；
 * - 文案以 JSON 命名空间并入 messages，客户端组件经
 *   NextIntlClientProvider（根布局注入）使用 useTranslations("auth")。
 */
export default getRequestConfig(async () => ({
  locale: "zh-CN",
  messages: { auth },
}));

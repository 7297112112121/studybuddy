import { describe, expect, it } from "vitest";
import getRequestConfigFn from "@/i18n/request";

/**
 * request.ts 请求级 i18n 配置（ADR-0010 无前缀策略）：
 * 无 [locale] 路由段，requestLocale 恒为 undefined；
 * 无 cookie / 无法读取 cookie（如测试直调、构建期预渲染）时兜底 zh-CN。
 */
describe("getRequestConfig（ADR-0010 无前缀策略）", () => {
  it("requestLocale 为 undefined 时兜底 zh-CN，messages 并入 auth 命名空间", async () => {
    const config = await getRequestConfigFn({
      requestLocale: Promise.resolve(undefined),
    });

    expect(config.locale).toBe("zh-CN");
    expect(config.messages).toBeDefined();
    expect(config.messages?.auth).toBeDefined();
    expect(config.messages?.auth.account.required).toBe("请输入手机号或邮箱");
  });
});

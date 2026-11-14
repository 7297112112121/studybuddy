import { describe, expect, it } from "vitest";
import getRequestConfigFn from "@/i18n/request";

/**
 * request.ts 请求级 i18n 配置（ADR-0010 无前缀策略）：
 * 单语言阶段固定 zh-CN（cookie 协商已移除——唯一支持语言 zh-CN 且全站
 * 无 NEXT_LOCALE 写入点，协商为可证明死代码；见 design.mdx 实现裁决注记）。
 * requestLocale 参数保留传入以锁定签名兼容，实现不再读取。
 */
describe("getRequestConfig（ADR-0010 无前缀策略）", () => {
  it("固定 zh-CN，messages 并入 auth 命名空间", async () => {
    const config = await getRequestConfigFn({
      requestLocale: Promise.resolve(undefined),
    });

    expect(config.locale).toBe("zh-CN");
    expect(config.messages).toBeDefined();
    expect(config.messages?.auth).toBeDefined();
    expect(config.messages?.auth.account.required).toBe("请输入手机号或邮箱");
  });
});

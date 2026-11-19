/**
 * T3 red 阶段:chatModel / generateStructured(模型注册与结构化调用)。
 * ai 的 generateObject 一律 vi.mock,不出网。
 */
import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

const generateObjectMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

import {
  chatModel,
  generateStructured,
} from "@/agent/runtime/deepseek-model";

afterEach(() => {
  vi.unstubAllEnvs();
  generateObjectMock.mockReset();
});

describe("chatModel", () => {
  it("缺 DEEPSEEK_API_KEY 时 throw", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(() => chatModel()).toThrow(/DEEPSEEK_API_KEY/);
  });

  it("有 env 时返回模型实例", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const model = chatModel();
    expect(model).toBeDefined();
  });
});

describe("generateStructured", () => {
  const schema = z.object({ verdict: z.string() });

  it("成功时返回 {ok:true, object}", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    generateObjectMock.mockResolvedValueOnce({
      object: { verdict: "APPLICABLE" },
    });
    const result = await generateStructured({
      schema,
      messages: [{ role: "user", content: "x" }],
    });
    expect(result).toEqual({ ok: true, object: { verdict: "APPLICABLE" } });
    // 请求形态断言:messages 与 schema 原样传入;model 为已配置的模型实例
    // (chatModel() 每次调用产生新实例,按 defined 断言不按引用)
    const call = generateObjectMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.messages).toEqual([{ role: "user", content: "x" }]);
    expect(call.schema).toBe(schema);
    expect(call.model).toBeDefined();
  });

  it("generateObject 抛错时归一 AI_UNAVAILABLE,不抛裸异常", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    generateObjectMock.mockRejectedValueOnce(new Error("boom"));
    const result = await generateStructured({
      schema,
      messages: [{ role: "user", content: "x" }],
    });
    expect(result).toEqual({ ok: false, error: "AI_UNAVAILABLE" });
  });

  it("AI SDK v7:system 消息拆出为 instructions,不进 messages", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    generateObjectMock.mockResolvedValueOnce({ object: { verdict: "NEEDS_RANGE" } });
    const result = await generateStructured({
      schema,
      messages: [
        { role: "system", content: "系统提示" },
        { role: "user", content: "条目" },
      ],
    });
    expect(result).toEqual({ ok: true, object: { verdict: "NEEDS_RANGE" } });
    const call = generateObjectMock.mock.calls[0]?.[0] as Record<string, unknown>;
    // v7 破坏性变更:messages 含 system 角色 → AI_InvalidPromptError,
    // 系统提示必须走 instructions 选项
    expect(call.instructions).toBe("系统提示");
    expect(call.messages).toEqual([{ role: "user", content: "条目" }]);
  });

  it("无 system 消息时不传 instructions", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    generateObjectMock.mockResolvedValueOnce({ object: { verdict: "APPLICABLE" } });
    await generateStructured({
      schema,
      messages: [{ role: "user", content: "x" }],
    });
    const call = generateObjectMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect("instructions" in call).toBe(false);
  });
});

/**
 * DeepSeek 模型注册与结构化调用封装(AXY-24 design「契约」节,ADR-0028):
 * provider 包 @ai-sdk/deepseek(备用 @ai-sdk/openai-compatible,Constraint 13),
 * 模型 deepseek-flash。generateStructured 把 ai generateObject 的任何失败
 * 归一为判别联合,不抛裸异常(ADR-0025 错误口径)。
 *
 * 本模块零业务知识:入参只认 schema 与 messages,不 import modules/。
 */
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject, type LanguageModel, type ModelMessage } from "ai";
import type { z } from "zod";

import { aiStubEnabled, stubStructured } from "./ai-stub-fixture";

/** DeepSeek 主力模型标识(ADR-0028,联网工具指定型号)。 */
export const DEEPSEEK_MODEL_ID = "deepseek-flash";

/** 取结构化调用模型;密钥缺失即抛(服务端配置错误,fail fast)。 */
export function chatModel(): LanguageModel {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }
  const deepseek = createDeepSeek({ apiKey });
  return deepseek(DEEPSEEK_MODEL_ID);
}

export type StructuredResult<S extends z.ZodType> =
  | { ok: true; object: z.infer<S> }
  | { ok: false; error: "AI_UNAVAILABLE" };

/** 结构化调用(generateObject 包装);任何异常归一 AI_UNAVAILABLE。 */
export async function generateStructured<S extends z.ZodType>(args: {
  schema: S;
  messages: ModelMessage[];
}): Promise<StructuredResult<S>> {
  if (aiStubEnabled()) {
    const stub = stubStructured(args.messages);
    if (stub.unavailable) {
      return { ok: false, error: "AI_UNAVAILABLE" };
    }
    return { ok: true, object: stub.object as unknown as z.infer<S> };
  }
  try {
    const { object } = await generateObject({
      model: chatModel(),
      schema: args.schema,
      messages: args.messages,
    });
    // ai 的 InferSchema<S> 与 zod 的 z.infer<S> 在未解析泛型下互不可赋,
    // 运行时恒同(schema 即传入对象),断言安全
    return { ok: true, object: object as unknown as z.infer<S> };
  } catch {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }
}

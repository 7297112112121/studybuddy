/**
 * 文件作用：Server Actions 统一归一流胶水——结果联合、zod 复验、异常归一与缓存刷新的单一来源。
 *
 * 成员：
 * 1. 操作结果（ActionResult）：增改删动作的统一判别联合返回；
 * 2. 字段错误（FieldErrors）：键为字段、值为错误 key 的宽松结构；
 * 3. 字段错误折算（toFieldErrors）：把 zod 校验错误折算成字段级错误；
 * 4. 统一归一流（runAction）：会话校验、入参复验、写入、异常归一、缓存刷新。
 *
 * 其他：
 * 1. 本文件无业务知识：会话以结构最小类型经参数注入，不 import 任何模块；
 * 2. 写入函数返回 false 归一为未找到（NOT_FOUND），异常归一为保存失败（SAVE_FAILED）；
 * 3. fieldErrors 只装错误 key，不返回文案原文。
 */
import { revalidatePath } from "next/cache";

import { z } from "zod";

export type ActionResult<TFieldErrors = never> =
  | { ok: true }
  | { ok: false; error: "INVALID_INPUT"; fieldErrors: TFieldErrors }
  | { ok: false; error: "UNAUTHORIZED" } // 无有效会话，客户端跳登录页
  | { ok: false; error: "NOT_FOUND" } // 不存在或不属于该用户，客户端静默刷新
  | { ok: false; error: "SAVE_FAILED" }; // 数据库写入失败

export type FieldErrors = Partial<Record<string, string>>;

/** 作用：把 zod 校验错误折算成字段级错误；同字段只取首条，值为错误 key。 */
export function toFieldErrors<TFieldErrors extends FieldErrors>(
  error: z.ZodError,
): TFieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in fieldErrors === false) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors as TFieldErrors;
}

/**
 * 作用：增改删动作共用的归一流。
 *
 * 流程：
 * 1. 校验会话；无有效会话返回未授权（UNAUTHORIZED）。
 * 2. zod 复验入参；失败返回输入无效（INVALID_INPUT）并携带字段错误。
 * 3. 调用写入函数；数据库异常返回保存失败（SAVE_FAILED），
 *    写入函数返回 false 时归一为未找到（NOT_FOUND）。
 * 4. 传入路径时刷新该路径缓存，返回成功。
 */
export async function runAction<TInput, TFieldErrors extends FieldErrors>(
  session: { user: { id: string } } | null,
  input: unknown,
  schema: z.ZodType<TInput>,
  write: (userId: string, input: TInput) => Promise<boolean | void>,
  path?: string,
): Promise<ActionResult<TFieldErrors>> {
  if (!session) {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      fieldErrors: toFieldErrors<TFieldErrors>(parsed.error),
    };
  }

  let written: boolean | void;
  try {
    written = await write(session.user.id, parsed.data);
  } catch {
    return { ok: false, error: "SAVE_FAILED" };
  }
  if (written === false) {
    return { ok: false, error: "NOT_FOUND" };
  }

  if (path !== undefined) {
    revalidatePath(path);
  }
  return { ok: true };
}

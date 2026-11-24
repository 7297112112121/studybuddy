/**
 * 统一接口契约切面:会话守卫、入参复验与错误翻译均为切面能力,
 * 会话获取内化于切面,业务操作只在契约内执行;
 * 响应体契约单一来源在 @/common/error。
 */
import { NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentSession } from "@/auth";
import {
  API_ERROR,
  ApiError,
  type ApiErrorCode,
  type ApiResult,
} from "@/common/error";

/**
 * 在接口契约内执行业务操作:会话由切面内经 getCurrentSession 取得,
 * 无有效会话归一未授权(UNAUTHORIZED),入参未过 schema 归一输入无效
 * (INVALID_INPUT)并携带字段级错误(fieldErrors);业务侧抛出的契约化错误
 * (ApiError)按错误码归一,其余异常一律归一保存失败(SAVE_FAILED)。
 * 业务操作返回值即成功载荷,无返回值即写端点形态。
 */
export async function withApiContract<TInput, TData>(
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (userId: string, input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: API_ERROR.UNAUTHORIZED };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: API_ERROR.INVALID_INPUT,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const data = await operation(session.user.id, parsed.data);
    return { ok: true, data } as ApiResult<TData>;
  } catch (error) {
    if (error instanceof ApiError) {
      const code = error.code;
      if (code === API_ERROR.INVALID_INPUT) {
        // 读入参非法时无表单字段可定位,字段级错误恒为空对象
        return { ok: false, error: API_ERROR.INVALID_INPUT, fieldErrors: {} };
      }
      return { ok: false, error: code };
    }
    return { ok: false, error: API_ERROR.SAVE_FAILED };
  }
}

/** 契约结果编码为 JSON 响应;判别以 body 为准,状态码仅传输语义。 */
export function respondWith(result: ApiResult<unknown>): Response {
  return NextResponse.json(result, {
    status: result.ok ? 200 : ERROR_STATUS[result.error],
  });
}

/** 错误码 → HTTP 状态码(仅传输语义);键域取自错误码联合,新增错误码未补映射即编译报错。 */
const ERROR_STATUS: Record<ApiErrorCode, number> = {
  [API_ERROR.INVALID_INPUT]: 400,
  [API_ERROR.UNAUTHORIZED]: 401,
  [API_ERROR.NOT_FOUND]: 404,
  [API_ERROR.SAVE_FAILED]: 500,
};

/** 把 zod 校验错误折算成字段级错误;同字段只取首条,值为错误文案 key。 */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

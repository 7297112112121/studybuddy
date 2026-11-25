/**
 * 统一接口契约切面:会话守卫、入参复验与错误翻译均为切面能力,
 * 有会话变体内化会话获取,无会话公开变体不设会话守卫;
 * 响应体契约单一来源在 @/common/error。
 */
import { NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentSession } from "@/auth";
import { USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import {
  API_ERROR,
  ApiError,
  type ApiErrorCode,
  type ApiResult,
} from "@/common/error";

/** 统一接口错误码全集:公共技术码(ApiErrorCode)+ 各端点族域码(定义于各层 error.ts)。 */
type ContractErrorCode = ApiErrorCode | typeof USERNAME_ALREADY_REGISTERED;

/**
 * 在接口契约内执行业务操作(有会话):会话由切面内经 getCurrentSession 取得,
 * 无有效会话归一未授权(UNAUTHORIZED);入参未过 schema 归一输入无效
 * (INVALID_INPUT)并携带字段级错误(fieldErrors);业务侧抛出的契约化错误
 * (ApiError)按错误码归一,其余异常一律归一保存失败(SAVE_FAILED)。
 * 业务操作返回值即成功载荷,无返回值即写端点形态。
 */
export async function withSessionApiContract<TInput, TData>(
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (userId: string, input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: API_ERROR.UNAUTHORIZED };
  }
  return runContract(input, schema, (data) => operation(session.user.id, data));
}

/**
 * 在接口契约内执行业务操作(无会话公开变体):不设会话守卫,注册等
 * 预认证端点用;入参复验与错误翻译与有会话变体同一内核(runContract)。
 */
export function withSessionlessApiContract<TInput, TData>(
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  return runContract(input, schema, operation);
}

/** 契约内核:入参复验、执行与错误翻译,供有会话/无会话两变体共用。 */
async function runContract<TInput, TData>(
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: API_ERROR.INVALID_INPUT,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const data = await operation(parsed.data);
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
export function respondWith<TError extends ContractErrorCode>(
  result: ApiResult<unknown, TError>,
): Response {
  return NextResponse.json(result, {
    status: result.ok ? 200 : ERROR_STATUS[result.error],
  });
}

/** 错误码 → HTTP 状态码(仅传输语义);键域取自错误码全集,新增错误码未补映射即编译报错。 */
const ERROR_STATUS: Record<ContractErrorCode, number> = {
  [API_ERROR.INVALID_INPUT]: 400,
  [API_ERROR.UNAUTHORIZED]: 401,
  [API_ERROR.NOT_FOUND]: 404,
  [API_ERROR.SAVE_FAILED]: 500,
  [USERNAME_ALREADY_REGISTERED]: 409,
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

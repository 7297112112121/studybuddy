/**
 * 统一接口契约切面:会话守卫、入参复验与错误翻译均为切面能力,
 * 有会话变体内化会话获取,无会话公开变体不设会话守卫;
 * 响应体契约单一来源在 @/common/error。
 */
import { NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentSession, type AuthSession } from "@/auth";
import { AUTH_ERROR_STATUS, USERNAME_ALREADY_REGISTERED } from "@/auth/error";
import { logger } from "@/common/logger";
import {
  API_ERROR,
  API_ERROR_STATUS,
  ApiError,
  toFieldErrors,
  type ApiErrorCode,
  type ApiResult,
} from "@/common/error";

/** 端点方向:决定技术报错兜底码——读归加载失败(LOAD_FAILED),写归保存失败(SAVE_FAILED);由请求方法推导,不在调用侧手写。 */
type ContractDirection = "read" | "write";

/** 方向由请求方法推导:读端点(GET)归读,其余方法归写。 */
function directionFromRequest(request: Request): ContractDirection {
  return request.method === "GET" ? "read" : "write";
}

/** 统一接口错误码全集:公共技术码(ApiErrorCode)+ 各端点族域码(定义于各层 error.ts)。 */
type ContractErrorCode = ApiErrorCode | typeof USERNAME_ALREADY_REGISTERED;

/** 按方向取技术报错兜底码;兜底码不含输入无效(INVALID_INPUT),后者带字段级错误单独成臂。 */
function fallbackCode(
  direction: ContractDirection,
): Exclude<ApiErrorCode, typeof API_ERROR.INVALID_INPUT> {
  return direction === "read" ? API_ERROR.LOAD_FAILED : API_ERROR.SAVE_FAILED;
}

/** 技术报错留痕:msg 只描述故障事件本身,归一定位信息(方向、阶段)进结构化字段;原始细节不进响应体。 */
function logUnexpectedError(
  error: unknown,
  direction: ContractDirection,
  stage: "session" | "operation",
): void {
  logger.error({ err: error, direction, stage }, "统一接口捕获未预期异常");
}

/**
 * 在接口契约内执行业务操作(有会话):会话由切面内经 getCurrentSession 取得,
 * 无有效会话归一未授权(UNAUTHORIZED),会话查询异常留痕后按方向归一兜底码;
 * 入参未过 schema 归一输入无效(INVALID_INPUT)并携带字段级错误(fieldErrors);
 * 业务侧抛出的契约化错误(ApiError)按错误码归一,其余异常留痕后按方向归一兜底码。
 * 业务操作返回值即成功载荷,无返回值即写端点形态。
 */
export async function withSessionApiContract<TInput, TData>(
  request: Request,
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (userId: string, input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  const direction = directionFromRequest(request);
  let session: AuthSession | null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    logUnexpectedError(error, direction, "session");
    return { ok: false, error: fallbackCode(direction) };
  }
  if (!session) {
    return { ok: false, error: API_ERROR.UNAUTHORIZED };
  }
  const userId = session.user.id;
  return runContract(input, schema, direction, (data) =>
    operation(userId, data),
  );
}

/**
 * 在接口契约内执行业务操作(无会话公开变体):不设会话守卫,注册等
 * 预认证端点用;入参复验与错误翻译与有会话变体同一内核(runContract)。
 */
export function withSessionlessApiContract<TInput, TData>(
  request: Request,
  input: unknown,
  schema: z.ZodType<TInput>,
  operation: (input: TInput) => Promise<TData>,
): Promise<ApiResult<TData>> {
  return runContract(input, schema, directionFromRequest(request), operation);
}

/** 契约内核:入参复验、执行与错误翻译,供有会话/无会话两变体共用。 */
async function runContract<TInput, TData>(
  input: unknown,
  schema: z.ZodType<TInput>,
  direction: ContractDirection,
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
    logUnexpectedError(error, direction, "operation");
    return { ok: false, error: fallbackCode(direction) };
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

/** 错误码 → HTTP 状态合并点(仅传输语义):状态映射随码登记于各层 error.ts,此处汇总并以错误码全集类型约束完备性,新增码未补状态即编译报错。 */
const ERROR_STATUS: Record<ContractErrorCode, number> = {
  ...API_ERROR_STATUS,
  ...AUTH_ERROR_STATUS,
};

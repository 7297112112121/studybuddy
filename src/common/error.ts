/**
 * 统一接口契约:错误码、契约化业务错误与响应体判别联合。
 */

/** 统一接口错误码:类型与运行时值同源,判别处一律引用本常量而非裸字面量。 */
export const API_ERROR = {
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  SAVE_FAILED: "SAVE_FAILED",
} as const;

export type ApiErrorCode = keyof typeof API_ERROR;

/** 业务层抛出的契约化错误(ApiError):携带错误码,切面按错误码归一进响应体;其余异常一律归一保存失败(SAVE_FAILED)。错误码类型参数容纳各层 error.ts 的域码。 */
export class ApiError<TCode extends string = ApiErrorCode> extends Error {
  constructor(readonly code: TCode) {
    super(code);
  }
}

/**
 * 统一接口响应体契约(以 body 判别,HTTP 状态码仅传输语义):
 * 写端点成功无载荷,读端点以数据载荷(data)携带返回值;
 * 字段级错误(fieldErrors)仅输入无效(INVALID_INPUT)时出现。
 * 错误码键域经类型参数扩展(默认公共技术码),端点族域码以联合传入。
 */
export type ApiResult<TData = undefined, TError extends string = ApiErrorCode> =
  | ([TData] extends [undefined] ? { ok: true } : { ok: true; data: TData })
  | {
      ok: false;
      error: typeof API_ERROR.INVALID_INPUT;
      fieldErrors: Record<string, string>;
    }
  | { ok: false; error: Exclude<TError, typeof API_ERROR.INVALID_INPUT> };

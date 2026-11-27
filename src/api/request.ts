/**
 * 统一接口的客户端请求封装:发起请求并把响应体解析为契约结果(ApiResult),
 * fetch reject 与响应解析异常按方向归一为兜底码(读归加载失败(LOAD_FAILED),
 * 写归保存失败(SAVE_FAILED))后返回,留痕 console.error;
 * 本封装不向调用侧抛出异常。
 */
import { API_ERROR, type ApiErrorCode, type ApiResult } from "@/common/error";

/** 请求统一接口端点并产出契约结果:判别以响应体为准,传输层异常
    (网络失败、响应解析失败)归一为方向兜底码。 */
export async function requestContractResult<
  TData = undefined,
  TError extends string = ApiErrorCode,
>(url: string, init?: RequestInit): Promise<ApiResult<TData, TError>> {
  const method = init?.method ?? "GET";
  try {
    const response = await fetch(url, {
      ...init,
      headers:
        init?.body === undefined
          ? init?.headers
          : { "Content-Type": "application/json", ...init?.headers },
    });
    return (await response.json()) as ApiResult<TData, TError>;
  } catch (error) {
    console.error(error);
    return { ok: false, error: fallbackCode(method) } as ApiResult<
      TData,
      TError
    >;
  }
}

/** 按方向取兜底码:与服务端契约切面同规则,方向由请求方法推导(GET 归读)。 */
function fallbackCode(
  method: string,
): Exclude<ApiErrorCode, typeof API_ERROR.INVALID_INPUT> {
  return method === "GET" ? API_ERROR.LOAD_FAILED : API_ERROR.SAVE_FAILED;
}

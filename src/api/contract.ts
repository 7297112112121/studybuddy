/**
 * 统一接口客户端契约切面:请求封装把请求发起与响应解析归一为契约结果
 * (ApiResult),传输层异常与响应载荷偏离契约按方向归一为兜底码并留痕;
 * 失败分支策略把收缩为失败臂的契约结果按码分派(未授权跳登录,其余交调用
 * 侧分支回调)。本切面不向调用侧抛出异常,不触碰状态,不依赖 stores。
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { ZodType } from "zod";

import {
  API_ERROR,
  type ApiErrorCode,
  type ApiFailure,
  type ApiResult,
} from "@/common/error";
import { ROUTES } from "@/common/routes";

/** 请求统一接口端点并产出契约结果:判别以响应体为准,传输层异常
    (网络失败、响应解析失败)归一为方向兜底码;传入响应契约 schema 时,
    成功载荷经其复验,偏离契约(留痕后)亦按方向兜底码归一。 */
export async function requestContractResult<
  TData = undefined,
  TError extends string = ApiErrorCode,
>(
  url: string,
  init?: RequestInit,
  dataSchema?: ZodType<TData>,
): Promise<ApiResult<TData, TError>> {
  const method = init?.method ?? "GET";
  try {
    const response = await fetch(url, {
      ...init,
      headers:
        init?.body === undefined
          ? init?.headers
          : { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await response.json()) as ApiResult<TData, TError>;
    if (!body.ok || dataSchema === undefined) {
      return body;
    }
    // 泛型下成功臂载荷在编译期只是断言,形状真伪交 schema 运行时判定
    const parsed = dataSchema.safeParse((body as { data: unknown }).data);
    if (!parsed.success) {
      console.error(parsed.error, "响应载荷偏离契约", url);
      return { ok: false, error: fallbackCode(method) } as ApiResult<
        TData,
        TError
      >;
    }
    return { ok: true, data: parsed.data } as ApiResult<TData, TError>;
  } catch (error) {
    console.error(error);
    return { ok: false, error: fallbackCode(method) } as ApiResult<
      TData,
      TError
    >;
  }
}

/** 契约失败分支策略 hook:调用方在契约结果收缩为失败臂后传入分支回调;
    未授权内部跳登录,无需调用方感知路由。 */
export function useApiFailureHandler() {
  const router = useRouter();

  return useCallback(
    async function handleApiFailure<TError extends string>(
      result: ApiFailure<TError>,
      handlers: ApiFailureHandlers<TError>,
    ): Promise<void> {
      switch (result.error) {
        case API_ERROR.INVALID_INPUT:
          if (handlers.onInvalidInput === undefined) {
            handlers.onFailure();
          } else {
            // case 守卫已证明失败臂为输入无效(INVALID_INPUT),泛型判别收窄由断言桥接
            handlers.onInvalidInput(
              (result as { fieldErrors: Record<string, string> }).fieldErrors,
            );
          }
          return;
        case API_ERROR.UNAUTHORIZED:
          router.replace(ROUTES.login);
          return;
        case API_ERROR.NOT_FOUND:
          await handlers.onNotFound?.();
          return;
        case API_ERROR.SAVE_FAILED:
        case API_ERROR.LOAD_FAILED:
          handlers.onFailure();
          return;
        default:
          // default 臂仅剩端点族域码,公共技术码已在上各臂返回
          if (handlers.onDomainCode === undefined) {
            handlers.onFailure();
          } else {
            await handlers.onDomainCode(
              result.error as Exclude<TError, ApiErrorCode>,
            );
          }
      }
    },
    [router],
  );
}

/** 按方向取兜底码:与服务端契约切面同规则,方向由请求方法推导(GET 归读)。 */
function fallbackCode(
  method: string,
): Exclude<ApiErrorCode, typeof API_ERROR.INVALID_INPUT> {
  return method === "GET" ? API_ERROR.LOAD_FAILED : API_ERROR.SAVE_FAILED;
}

type ApiFailureHandlers<TError extends string> = {
  /** 输入无效:携带字段级错误(fieldErrors),表单链呈现字段文案。 */
  onInvalidInput?: (fieldErrors: Record<string, string>) => void;
  /** 未找到:条目已被他端删除等,调用方按当前读域恢复(重取/收尾)。 */
  onNotFound?: () => void | Promise<void>;
  /** 端点族域码:公共技术码之外的业务拒绝(如注册账户名已存在)。 */
  onDomainCode?: (code: Exclude<TError, ApiErrorCode>) => void | Promise<void>;
  /** 技术失败:呈现失败文案。 */
  onFailure: () => void;
};

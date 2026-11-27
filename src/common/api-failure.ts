/**
 * 统一接口契约结果的客户端失败分支策略:未授权跳登录、未找到交恢复回调、
 * 输入无效交字段回调(未接则按技术失败呈现)、技术失败交失败回调、
 * 端点族域码交域码回调(未接则按技术失败呈现)。
 * fetch reject 已由统一接口客户端请求封装(api-client)归一进契约码,
 * 不再有调用侧异常分支。
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { API_ERROR, type ApiErrorCode, type ApiFailure } from "./error";
import { ROUTES } from "./routes";

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

/**
 * 统一接口契约结果的客户端失败分支策略：未授权跳登录、未找到交恢复回调、
 * 输入无效交字段回调（未接则按技术失败呈现）、其余技术失败交失败回调。
 * 只消费契约失败结果；fetch reject 由调用侧留痕归一后不再进入本策略。
 */
import { useRouter } from "next/navigation";

import { API_ERROR, type ApiErrorCode } from "./error";
import { ROUTES } from "./routes";

/** 契约失败臂：ApiResult 判别联合的 ok:false 半边（调用方先行收缩成功臂）。 */
export type ApiFailure =
  | {
      ok: false;
      error: typeof API_ERROR.INVALID_INPUT;
      fieldErrors: Record<string, string>;
    }
  | {
      ok: false;
      error: Exclude<ApiErrorCode, typeof API_ERROR.INVALID_INPUT>;
    };

type ApiFailureHandlers = {
  /** 输入无效：携带字段级错误（fieldErrors），表单链呈现字段文案。 */
  onInvalidInput?: (fieldErrors: Record<string, string>) => void;
  /** 未找到：条目已被他端删除等，调用方按当前读域恢复（重取/收尾）。 */
  onNotFound?: () => void | Promise<void>;
  /** 技术失败：呈现失败文案。 */
  onFailure: () => void;
};

/** 契约失败分支策略 hook：返回处置函数，调用方在契约结果收缩为失败臂后
    传入分支回调；未授权内部跳登录，无需调用方感知路由。 */
export function useApiFailureHandler() {
  const router = useRouter();

  return async function handleApiFailure(
    result: ApiFailure,
    handlers: ApiFailureHandlers,
  ): Promise<void> {
    switch (result.error) {
      case API_ERROR.INVALID_INPUT:
        if (handlers.onInvalidInput === undefined) {
          handlers.onFailure();
        } else {
          handlers.onInvalidInput(result.fieldErrors);
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
    }
  };
}

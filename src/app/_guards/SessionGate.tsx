"use client";

/**
 * 会话门（SessionGate）：路由组的客户端门卫（守卫客户端化裁决的机制承载）——
 * 订阅会话 store，不满足门向时 replace 到 fallbackTo。机制不导出，语义门
 * （AuthenticatedGate / AnonymousGate）是唯一挂载面：门向词汇全库只拼写一次，
 * 路由组按放行对象选门，选错门名一眼可见。
 *
 * 跳转一律 replace，勿改回「有历史 → router.back()」：重登场景下 back 落回
 * /login → 布局再次翻转 → 再 back，循环退栈直至 about:blank。安全边界不在
 * 本组件：统一接口逐端点会话校验才是硬约束，本门只做路由级分流。
 */
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useStore } from "better-auth/react";

import { authClient } from "@/stores/auth-client";

type GateDirection = "authenticated" | "anonymous";

type SessionGateProps = {
  /**
   * 门向（描述门放行什么人，与页面类别无关）：authenticated=放行已认证者，
   * 未持有会话踢出（受保护组）；anonymous=放行匿名者，已持有会话踢出（访客组）。
   */
  require: GateDirection;
  /** 不满足门向时 replace 的落点。 */
  fallbackTo: string;
  /** replace 落定前瞬间的占位（如访客组的「正在进入…」），默认不渲染。 */
  denied?: ReactNode;
  /** 满足门向时渲染的内容。 */
  children?: ReactNode;
};

function SessionGate(props: SessionGateProps) {
  const { data: session, isPending } = useStore(authClient.useSession);
  const router = useRouter();
  const granted =
    props.require === "authenticated" ? Boolean(session) : !session;

  useEffect(() => {
    if (!isPending && !granted) {
      router.replace(props.fallbackTo);
    }
  }, [isPending, granted, props.fallbackTo, router]);

  if (isPending) {
    return null;
  }
  if (!granted) {
    return props.denied ?? null;
  }
  return <>{props.children}</>;
}

type GateProps = Omit<SessionGateProps, "require">;

/** 已认证之门：放行持有会话者，供受保护路由组挂载。 */
export function AuthenticatedGate(props: GateProps) {
  return <SessionGate require="authenticated" {...props} />;
}

/** 匿名之门：放行无会话者，供访客路由组（登录/注册）挂载。 */
export function AnonymousGate(props: GateProps) {
  return <SessionGate require="anonymous" {...props} />;
}
